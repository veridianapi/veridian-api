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

    console.log("[JWT DEBUG] token prefix:", token.substring(0, 20));

    let decoded: jwt.JwtPayload | null = null;

    try {
      const secret = Buffer.from(jwtSecret, "base64");
      decoded = jwt.verify(token, secret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    } catch {
      try {
        decoded = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
      } catch (err2: unknown) {
        const msg = err2 instanceof Error ? err2.message : String(err2);
        console.error("[JWT DEBUG] both verify attempts failed:", msg);
        reply.status(401).send({ error: "Invalid or expired token" });
        return;
      }
    }

    console.log("[JWT DEBUG] decoded sub:", decoded?.sub);

    if (!decoded?.sub) {
      reply.status(401).send({ error: "Invalid token payload" });
      return;
    }

    request.customerId = decoded.sub;
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
