import { Queue } from "bullmq";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error("Missing REDIS_URL env var");

// Parse REDIS_URL into ioredis connection options
const url = new URL(redisUrl);
const connection = {
  host: url.hostname,
  port: Number(url.port) || 6379,
  ...(url.password ? { password: url.password } : {}),
  ...(url.protocol === "rediss:" ? { tls: {} } : {}),
};

export const verificationQueue = new Queue("verifications", { connection });

export interface VerificationJobData {
  verification_id: string;
  customer_id: string;
  document_type: string;
  s3_prefix: string;
  webhook_url: string | null;
}

export async function addVerificationJob(
  data: VerificationJobData
): Promise<void> {
  await verificationQueue.add("process", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  });
}
