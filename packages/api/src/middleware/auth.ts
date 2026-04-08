import { FastifyRequest, FastifyReply } from "fastify";
import { createHash } from "crypto";
import { supabase } from "../lib/supabase.js";

declare module "fastify" {
  interface FastifyRequest {
    customerId: string;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    reply.status(401).send({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  const hashedKey = createHash("sha256").update(token).digest("hex");

  const { data, error } = await supabase
    .from("api_keys")
    .select("customer_id")
    .eq("key_hash", hashedKey)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    reply.status(401).send({ error: "Invalid API key" });
    return;
  }

  request.customerId = data.customer_id;
}
