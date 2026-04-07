import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error("Missing REDIS_URL env var");
}

export const redis = new Redis(redisUrl);

redis.on("error", (err) => {
  console.error("Redis error:", err);
});
