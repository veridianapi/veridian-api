import { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID, randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { authenticate } from "../middleware/auth.js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SESSION_TTL_MINUTES = 30;
const VERIFY_BASE_URL = "https://verify.veridianapi.com";

const CreateSessionSchema = z.object({
  redirect_url: z.string().url().optional(),
});

type CreateSessionBody = z.infer<typeof CreateSessionSchema>;

export async function sessionsRoute(app: FastifyInstance): Promise<void> {
  // POST /v1/sessions
  app.post<{ Body: CreateSessionBody }>(
    "/",
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const parsed = CreateSessionSchema.safeParse(request.body ?? {});
        if (!parsed.success) {
          reply.status(400).send({
            error: "Validation failed",
            detail: parsed.error.issues.map((i) => i.message).join("; "),
          });
          return;
        }

        const sessionId = randomUUID();
        const sessionToken = randomBytes(32).toString("hex");
        const expiresAt = new Date(
          Date.now() + SESSION_TTL_MINUTES * 60 * 1000
        ).toISOString();

        const { error } = await supabaseAdmin
          .from("verification_sessions")
          .insert({
            id: sessionId,
            customer_id: request.customerId,
            session_token: sessionToken,
            redirect_url: parsed.data.redirect_url ?? null,
            status: "pending",
            verification_id: null,
            expires_at: expiresAt,
          });

        if (error) {
          request.log.error({ err: error }, "Failed to insert verification session");
          reply.status(500).send({ error: "Failed to create session", detail: error.message });
          return;
        }

        reply.status(201).send({
          session_id: sessionId,
          url: `${VERIFY_BASE_URL}/s/${sessionToken}`,
          expires_at: expiresAt,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        request.log.error(err);
        reply.status(500).send({ error: "Internal error", detail: message });
      }
    }
  );

  // GET /v1/sessions/:id
  app.get<{ Params: { id: string } }>(
    "/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params;

      const { data, error } = await supabaseAdmin
        .from("verification_sessions")
        .select("id, status, verification_id, redirect_url, expires_at, created_at")
        .eq("id", id)
        .eq("customer_id", request.customerId)
        .single();

      if (error || !data) {
        reply.status(404).send({ error: "Session not found" });
        return;
      }

      reply.send(data);
    }
  );
}
