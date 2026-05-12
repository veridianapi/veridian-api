import { FastifyRequest, FastifyReply } from "fastify";
import { createHash } from "crypto";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { supabase } from "../lib/supabase.js";

declare module "fastify" {
  interface FastifyRequest {
    customerId: string;
    isSandbox: boolean;
  }
}

const client = jwksClient({
  jwksUri: `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000,
});

async function getSigningKey(kid: string): Promise<string> {
  const key = await client.getSigningKey(kid);
  return key.getPublicKey();
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
    console.log("[JWT DEBUG] token prefix:", token.substring(0, 20));

    try {
      const decoded_header = jwt.decode(token, { complete: true });
      const kid = (decoded_header?.header as jwt.JwtHeader)?.kid;
      if (!kid) {
        console.error("[JWT DEBUG] missing kid in token header");
        reply.status(401).send({ error: "Invalid token: missing key ID" });
        return;
      }

      const signingKey = await getSigningKey(kid);
      const decoded = jwt.verify(token, signingKey, {
        algorithms: ["ES256"],
      }) as jwt.JwtPayload;

      console.log("[JWT DEBUG] decoded sub:", decoded.sub);

      if (!decoded.sub) {
        reply.status(401).send({ error: "Invalid token: missing sub claim" });
        return;
      }

      request.customerId = decoded.sub;
      request.isSandbox = false;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[JWT DEBUG] verify error:", msg);
      reply.status(401).send({ error: "Invalid or expired token" });
    }
    return;
  }

  // API key path — hash and look up in api_keys table
  const hashedKey = createHash("sha256").update(token).digest("hex");
  console.log('[AUTH DEBUG] Token prefix:', token.slice(0, 20));
  console.log('[AUTH DEBUG] Computed hash:', hashedKey);

  const { data, error } = await supabase
    .from("api_keys")
    .select("customer_id, is_sandbox")
    .eq("key_hash", hashedKey)
    .eq("is_active", true)
    .single();

  console.log('[AUTH DEBUG] Supabase query result:', JSON.stringify(data));
  console.log('[AUTH DEBUG] Supabase error:', JSON.stringify(error));

  if (error || !data) {
    reply.status(401).send({ error: "Invalid API key" });
    return;
  }

  request.customerId = data.customer_id;
  request.isSandbox = data.is_sandbox ?? false;
}
