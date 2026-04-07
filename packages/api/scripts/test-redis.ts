import "dotenv/config";
import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error("Missing REDIS_URL env var");

const client = new Redis(redisUrl, {
  tls: { rejectUnauthorized: false },
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

client.on("ready", () => console.log("Redis connected"));
client.on("error", (err) => console.error("Redis error:", err));

await client.rpush("test-key", "hello-veridian");
const value = await client.lrange("test-key", 0, -1);
console.log("test-key contents:", value);

await client.del("test-key");
await client.quit();
