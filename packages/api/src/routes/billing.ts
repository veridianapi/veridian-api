import { FastifyInstance } from "fastify";
import { z } from "zod";
import { EventName } from "@paddle/paddle-node-sdk";
import { paddle } from "../lib/paddle.js";
import { supabase } from "../lib/supabase.js";
import { authenticate } from "../middleware/auth.js";

const isProduction = process.env.NODE_ENV === "production";

const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  starter: isProduction
    ? process.env.PADDLE_PRICE_STARTER
    : process.env.PADDLE_SANDBOX_PRICE_STARTER,
  growth: isProduction
    ? process.env.PADDLE_PRICE_GROWTH
    : process.env.PADDLE_SANDBOX_PRICE_GROWTH,
  scale: isProduction
    ? process.env.PADDLE_PRICE_SCALE
    : process.env.PADDLE_SANDBOX_PRICE_SCALE,
};

const CheckoutSchema = z.object({
  plan: z.enum(["starter", "growth", "scale"]),
});

export async function billingRoutes(app: FastifyInstance): Promise<void> {
  // POST /v1/billing/checkout
  app.post<{ Body: { plan: string } }>(
    "/v1/billing/checkout",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = CheckoutSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400).send({ error: "Validation failed", detail: parsed.error.issues.map((i) => i.message).join("; ") });
        return;
      }

      const { plan } = parsed.data;
      const priceId = PLAN_PRICE_IDS[plan];
      if (!priceId) {
        reply.status(500).send({ error: `No Paddle price configured for plan: ${plan}` });
        return;
      }

      const checkoutUrl = `https://buy.paddle.com/product/${priceId}`;
      reply.send({ checkout_url: checkoutUrl });
    }
  );

  // GET /v1/billing/subscription
  app.get(
    "/v1/billing/subscription",
    { preHandler: authenticate },
    async (request, reply) => {
      const { data, error } = await supabase
        .from("customers")
        .select("plan, subscription_status, next_billing_date")
        .eq("id", request.customerId)
        .single();

      if (error || !data) {
        reply.status(404).send({ error: "Customer not found" });
        return;
      }

      reply.send({
        plan: data.plan,
        status: data.subscription_status,
        next_billing_date: data.next_billing_date,
      });
    }
  );

  // POST /v1/billing/webhook — no auth, Paddle calls this directly
  // Registered in its own scoped context to capture the raw body string
  // needed for HMAC signature verification.
  app.register(async (scope) => {
    scope.addContentTypeParser(
      "application/json",
      { parseAs: "string" },
      (_req, body, done) => done(null, body)
    );

    scope.post("/v1/billing/webhook", async (request, reply) => {
      const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        request.log.error("PADDLE_WEBHOOK_SECRET is not set");
        reply.status(500).send({ error: "Webhook secret not configured" });
        return;
      }

      const signature = request.headers["paddle-signature"];
      if (!signature || typeof signature !== "string") {
        reply.status(400).send({ error: "Missing paddle-signature header" });
        return;
      }

      const rawBody = request.body as string;

      let event;
      try {
        event = await paddle.webhooks.unmarshal(rawBody, webhookSecret, signature);
      } catch (err) {
        request.log.warn({ err }, "Paddle webhook signature verification failed");
        reply.status(400).send({ error: "Invalid webhook signature" });
        return;
      }

      try {
        switch (event.eventType) {
          case EventName.SubscriptionActivated: {
            const sub = event.data;
            const customData = sub.customData as { customer_id?: string; plan?: string } | null;
            if (customData?.customer_id) {
              await supabase
                .from("customers")
                .update({
                  plan: customData.plan ?? null,
                  subscription_status: "active",
                  paddle_subscription_id: sub.id,
                  next_billing_date: sub.nextBilledAt ?? null,
                })
                .eq("id", customData.customer_id);
            }
            break;
          }

          case EventName.SubscriptionCanceled: {
            const sub = event.data;
            const customData = sub.customData as { customer_id?: string } | null;
            if (customData?.customer_id) {
              await supabase
                .from("customers")
                .update({ subscription_status: "canceled", next_billing_date: null })
                .eq("id", customData.customer_id);
            }
            break;
          }

          case EventName.TransactionCompleted: {
            const tx = event.data;
            const customData = tx.customData as { customer_id?: string; plan?: string } | null;
            if (customData?.customer_id && customData.plan) {
              await supabase
                .from("customers")
                .update({ plan: customData.plan, subscription_status: "active" })
                .eq("id", customData.customer_id);
            }
            break;
          }

          default:
            request.log.info(`Unhandled Paddle event: ${event.eventType}`);
        }
      } catch (err) {
        request.log.error({ err }, "Error processing Paddle webhook");
        // Still return 200 — Paddle will retry on non-2xx, and DB errors
        // shouldn't cause unnecessary retries for already-verified events.
      }

      reply.status(200).send({ received: true });
    });
  });
}
