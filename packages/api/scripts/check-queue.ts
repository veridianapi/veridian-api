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

const [waiting, active, completed, failed, waitingJobs, failedJobs] =
  await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getWaiting(),
    queue.getFailed(),
  ]);

console.log("Queue counts:");
console.log(`  waiting:   ${waiting}`);
console.log(`  active:    ${active}`);
console.log(`  completed: ${completed}`);
console.log(`  failed:    ${failed}`);

if (waitingJobs.length === 0) {
  console.log("\nWaiting jobs: none");
} else {
  console.log("\nWaiting job IDs:");
  for (const job of waitingJobs) {
    console.log(`  ${job.id}  (verification_id: ${job.data.verification_id})`);
  }
}

if (failedJobs.length === 0) {
  console.log("\nFailed jobs: none");
} else {
  console.log("\nFailed jobs:");
  for (const job of failedJobs) {
    console.log(`  ${job.id}  (verification_id: ${job.data.verification_id})  Error: ${job.failedReason}`);
  }
}

async function clearFailedJobs(): Promise<void> {
  const jobs = await queue.getFailed();
  for (const job of jobs) {
    await job.remove();
  }
  console.log(`\nCleared ${jobs.length} failed job(s)`);
}

if (process.argv.includes("--clear-failed")) {
  await clearFailedJobs();
}

await queue.close();
await connection.quit();
