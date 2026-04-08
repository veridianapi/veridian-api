import { FastifyInstance } from "fastify";

const VERSION = "1.0.0";

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => {
    return {
      status: "ok",
      version: VERSION,
      timestamp: new Date(),
      uptime: process.uptime(),
    };
  });
}
