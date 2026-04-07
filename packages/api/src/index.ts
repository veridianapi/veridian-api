import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { healthRoutes } from "./routes/health.js";
import { verificationRoutes } from "./routes/verifications.js";
import { billingRoutes } from "./routes/billing.js";

const app = Fastify({ logger: true });

await app.register(helmet);
await app.register(cors);
await app.register(rateLimit, {
  max: 100,
  timeWindow: "1 minute",
});

await app.register(healthRoutes);
await app.register(verificationRoutes);
await app.register(billingRoutes);

const port = Number(process.env.PORT) || 3001;

try {
  await app.listen({ port, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
