import { FastifyRequest, FastifyReply } from "fastify";
import { createHash } from "crypto";
import jwt from "jsonwebtoken";
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

  // Supabase JWTs always start with "eyJ" (base64-encoded '{"')
  if (token.startsWith("eyJ")) {
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      request.log.error("SUPABASE_JWT_SECRET is not configured");
      reply.status(500).send({ error: "Server misconfiguration" });
      return;
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
      const userId = decoded.sub;
      if (!userId) {
        reply.status(401).send({ error: "Invalid token: missing sub claim" });
        return;
      }
      request.customerId = userId;
    } catch {
      reply.status(401).send({ error: "Invalid or expired token" });
    }
    return;
  }

  // API key path — hash and look up in api_keys table
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
