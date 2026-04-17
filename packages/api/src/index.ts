import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { healthRoutes } from "./routes/health.js";
import { verificationRoutes } from "./routes/verifications.js";
import { billingRoutes } from "./routes/billing.js";
import { sessionsRoute } from "./routes/sessions.js";

const app = Fastify({ logger: true });

await app.register(helmet);

// Restrict origins in production via ALLOWED_ORIGINS (comma-separated).
// /v1/billing/webhook is exempt — Paddle authenticates via HMAC signature.
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map((s) => s.trim());
await app.register(cors, {
  origin: allowedOrigins?.length ? allowedOrigins : true,
});

await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

await app.register(healthRoutes);
await app.register(verificationRoutes);
await app.register(billingRoutes);
await app.register(sessionsRoute, { prefix: "/v1/sessions" });

const port = Number(process.env.PORT) || 3001;

try {
  await app.listen({ port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
