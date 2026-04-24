import { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomBytes } from "crypto";
import { supabase } from "../lib/supabase.js";
import { authenticate } from "../middleware/auth.js";

const CreateWebhookSchema = z.object({
  url: z.string().url("url must be a valid URL"),
  events: z.array(z.string().min(1)).min(1, "at least one event is required"),
});

export async function webhooksRoute(app: FastifyInstance): Promise<void> {
  // GET / — list all webhook endpoints for authenticated customer
  app.get(
    "/",
    { preHandler: authenticate },
    async (request, reply) => {
      const { data, error } = await supabase
        .from("webhook_endpoints")
        .select("id, url, events, enabled, created_at")
        .eq("customer_id", request.customerId)
        .order("created_at", { ascending: false });

      if (error) {
        request.log.error({ err: error }, "Failed to list webhook endpoints");
        reply.status(500).send({ error: "Failed to list webhooks" });
        return;
      }

      reply.send(data ?? []);
    }
  );

  // GET /deliveries — list recent deliveries (register before /:id to avoid shadowing)
  app.get(
    "/deliveries",
    { preHandler: authenticate },
    async (request, reply) => {
      // Fetch endpoint IDs owned by this customer first
      const { data: endpoints, error: epError } = await supabase
        .from("webhook_endpoints")
        .select("id")
        .eq("customer_id", request.customerId);

      if (epError) {
        request.log.error({ err: epError }, "Failed to fetch endpoints for deliveries");
        reply.status(500).send({ error: "Failed to list deliveries" });
        return;
      }

      const endpointIds = (endpoints ?? []).map((e: { id: string }) => e.id);

      if (endpointIds.length === 0) {
        reply.send([]);
        return;
      }

      const { data, error } = await supabase
        .from("webhook_deliveries")
        .select("id, endpoint_id, verification_id, event, status_code, response_body, success, attempted_at")
        .in("endpoint_id", endpointIds)
        .order("attempted_at", { ascending: false })
        .limit(50);

      if (error) {
        request.log.error({ err: error }, "Failed to list webhook deliveries");
        reply.status(500).send({ error: "Failed to list deliveries" });
        return;
      }

      reply.send(data ?? []);
    }
  );

  // POST / — create webhook endpoint
  app.post(
    "/",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = CreateWebhookSchema.safeParse(request.body);
      if (!parsed.success) {
        reply.status(400).send({
          error: "Validation failed",
          detail: parsed.error.issues.map((i) => i.message).join("; "),
        });
        return;
      }

      const { url, events } = parsed.data;
      const secret = randomBytes(32).toString("hex");

      const { data, error } = await supabase
        .from("webhook_endpoints")
        .insert({
          customer_id: request.customerId,
          url,
          events,
          secret,
          enabled: true,
        })
        .select("id, url, events, enabled, created_at")
        .single();

      if (error || !data) {
        request.log.error({ err: error }, "Failed to create webhook endpoint");
        reply.status(500).send({ error: "Failed to create webhook" });
        return;
      }

      // Secret is returned only on creation
      reply.status(201).send({ ...data, secret });
    }
  );

  // DELETE /:id — delete webhook endpoint
  app.delete<{ Params: { id: string } }>(
    "/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params;

      const { error } = await supabase
        .from("webhook_endpoints")
        .delete()
        .eq("id", id)
        .eq("customer_id", request.customerId);

      if (error) {
        request.log.error({ err: error }, "Failed to delete webhook endpoint");
        reply.status(500).send({ error: "Failed to delete webhook" });
        return;
      }

      reply.status(204).send();
    }
  );
}
