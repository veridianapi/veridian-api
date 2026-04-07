import "dotenv/config";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error("Missing REDIS_URL env var");

const connection = new Redis(redisUrl, {
  tls: { rejectUnauthorized: false },
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const queue = new Queue("verifications", { connection });

await queue.obliterate({ force: true });
console.log("Queue cleared");

await queue.close();
await connection.quit();
