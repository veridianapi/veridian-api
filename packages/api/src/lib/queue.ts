import { Queue } from "bullmq";
import { Redis } from "ioredis";

export interface VerificationJobData {
  verification_id: string;
  customer_id: string;
  document_type: string;
  s3_prefix: string;
  webhook_url: string | null;
  has_document_back: boolean;
}

let queueInstance: Queue | null = null;

function getQueue(): Queue {
  if (queueInstance) return queueInstance;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) throw new Error("Missing REDIS_URL env var");

  const connection = new Redis(redisUrl, {
    tls: { rejectUnauthorized: false },
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  queueInstance = new Queue("verifications", { connection });
  return queueInstance;
}

export async function addVerificationJob(
  data: VerificationJobData
): Promise<void> {
  await getQueue().add("process", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  });
}
