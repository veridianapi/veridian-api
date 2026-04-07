import "dotenv/config";
import { Worker, Job } from "bullmq";
import { createHmac } from "crypto";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import {
  AnalyzeDocumentCommand,
  type Block,
} from "@aws-sdk/client-textract";
import { CompareFacesCommand } from "@aws-sdk/client-rekognition";
import { s3, textract, rekognition } from "../lib/aws.js";
import { supabase } from "../lib/supabase.js";
import type { VerificationJobData } from "../lib/queue.js";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET ?? "";
const S3_BUCKET = process.env.AWS_S3_BUCKET!;

// ── S3 helpers ────────────────────────────────────────────────────────────────

async function downloadFromS3(key: string): Promise<Buffer> {
  const response = await s3.send(
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key })
  );
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// ── Textract ──────────────────────────────────────────────────────────────────

interface ExtractedFields {
  full_name: string | null;
  date_of_birth: string | null;
  document_number: string | null;
  expiry_date: string | null;
  nationality: string | null;
}

const FIELD_ALIASES: Record<keyof ExtractedFields, string[]> = {
  full_name: ["full name", "name", "surname"],
  date_of_birth: ["date of birth", "dob", "birth date"],
  document_number: ["document number", "passport no", "licence no", "id number"],
  expiry_date: ["expiry date", "expiry", "date of expiry", "valid until"],
  nationality: ["nationality", "country"],
};

function extractFields(blocks: Block[]): ExtractedFields {
  // Build a map of KEY_VALUE_SET pairs from Textract
  const keyBlocks = blocks.filter(
    (b) => b.BlockType === "KEY_VALUE_SET" && b.EntityTypes?.includes("KEY")
  );
  const blockMap = new Map(blocks.map((b) => [b.Id!, b]));

  function getText(ids: string[] | undefined): string {
    if (!ids) return "";
    return ids
      .map((id) => blockMap.get(id))
      .filter(Boolean)
      .flatMap((b) => b!.Relationships ?? [])
      .filter((r) => r.Type === "CHILD")
      .flatMap((r) => r.Ids ?? [])
      .map((id) => blockMap.get(id)?.Text ?? "")
      .join(" ")
      .trim();
  }

  const kvPairs: Array<{ key: string; value: string }> = keyBlocks.map((kb) => {
    const valueId = (kb.Relationships ?? [])
      .find((r) => r.Type === "VALUE")
      ?.Ids?.[0];
    const valueBlock = valueId ? blockMap.get(valueId) : undefined;
    return {
      key: getText(
        (kb.Relationships ?? [])
          .find((r) => r.Type === "CHILD")
          ?.Ids
      ).toLowerCase(),
      value: getText(
        (valueBlock?.Relationships ?? [])
          .find((r) => r.Type === "CHILD")
          ?.Ids
      ),
    };
  });

  const result: ExtractedFields = {
    full_name: null,
    date_of_birth: null,
    document_number: null,
    expiry_date: null,
    nationality: null,
  };

  for (const field of Object.keys(result) as Array<keyof ExtractedFields>) {
    const aliases = FIELD_ALIASES[field];
    const match = kvPairs.find(({ key }) =>
      aliases.some((alias) => key.includes(alias))
    );
    if (match) result[field] = match.value || null;
  }

  return result;
}

// ── Rekognition ───────────────────────────────────────────────────────────────

async function compareFaces(
  documentImage: Buffer,
  selfieImage: Buffer
): Promise<number> {
  const response = await rekognition.send(
    new CompareFacesCommand({
      SourceImage: { Bytes: documentImage },
      TargetImage: { Bytes: selfieImage },
      SimilarityThreshold: 0,
    })
  );
  const topMatch = response.FaceMatches?.[0];
  return topMatch ? (topMatch.Similarity ?? 0) / 100 : 0;
}

// ── OFAC sanctions screening ──────────────────────────────────────────────────

async function screenSanctions(fullName: string): Promise<boolean> {
  // Use Supabase pg_trgm similarity — requires the extension enabled in your project
  const { data, error } = await supabase.rpc("ofac_similarity_search", {
    query_name: fullName,
    threshold: 0.6,
  });
  if (error) {
    console.error("OFAC screening error:", error);
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}

// ── Risk scoring ──────────────────────────────────────────────────────────────

function calculateRiskScore(params: {
  sanctionsHit: boolean;
  faceMatchScore: number;
  expiryDate: string | null;
  missingFields: boolean;
}): number {
  let score = 0;
  if (params.sanctionsHit) score += 40;
  if (params.faceMatchScore < 0.8) score += 30;
  if (isDocumentExpired(params.expiryDate)) score += 20;
  if (params.missingFields) score += 10;
  return score;
}

function isDocumentExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return true;
  const parsed = new Date(expiryDate);
  return !isNaN(parsed.getTime()) && parsed < new Date();
}

function statusFromScore(score: number): "approved" | "review" | "rejected" {
  if (score < 30) return "approved";
  if (score < 70) return "review";
  return "rejected";
}

// ── Webhook delivery ──────────────────────────────────────────────────────────

async function deliverWebhook(
  url: string,
  payload: Record<string, unknown>
): Promise<void> {
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-veridian-signature": signature,
        },
        body,
      });
      if (res.ok) return;
      console.warn(`Webhook attempt ${attempt + 1} failed: HTTP ${res.status}`);
    } catch (err) {
      console.warn(`Webhook attempt ${attempt + 1} error:`, err);
    }
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
  console.error(`Webhook delivery failed after 3 attempts: ${url}`);
}

// ── Worker ────────────────────────────────────────────────────────────────────

const redisUrl = process.env.REDIS_URL!;
const url = new URL(redisUrl);
const connection = {
  host: url.hostname,
  port: Number(url.port) || 6379,
  ...(url.password ? { password: url.password } : {}),
  ...(url.protocol === "rediss:" ? { tls: {} } : {}),
};

async function processVerification(
  job: Job<VerificationJobData>
): Promise<void> {
  const { verification_id, s3_prefix, webhook_url } = job.data;

  // 1. Download images from S3
  const [documentFront, selfie] = await Promise.all([
    downloadFromS3(`${s3_prefix}/document_front`),
    downloadFromS3(`${s3_prefix}/selfie`),
  ]);

  // 2. Textract — extract document fields
  const textractResponse = await textract.send(
    new AnalyzeDocumentCommand({
      Document: { Bytes: documentFront },
      FeatureTypes: ["FORMS"],
    })
  );
  const extracted = extractFields(textractResponse.Blocks ?? []);

  // 3. Rekognition — face match
  const faceMatchScore = await compareFaces(documentFront, selfie);

  // 4. OFAC sanctions screening
  const sanctionsHit = extracted.full_name
    ? await screenSanctions(extracted.full_name)
    : false;

  // 5. Risk score
  const missingFields = Object.values(extracted).some((v) => v === null);
  const riskScore = calculateRiskScore({
    sanctionsHit,
    faceMatchScore,
    expiryDate: extracted.expiry_date,
    missingFields,
  });
  const status = statusFromScore(riskScore);

  // 6. Persist results
  const { error } = await supabase
    .from("verifications")
    .update({
      status,
      risk_score: riskScore,
      face_match_score: faceMatchScore,
      sanctions_hit: sanctionsHit,
      full_name: extracted.full_name,
      date_of_birth: extracted.date_of_birth,
      document_number: extracted.document_number,
      expiry_date: extracted.expiry_date,
      nationality: extracted.nationality,
      processed_at: new Date().toISOString(),
    })
    .eq("id", verification_id);

  if (error) throw new Error(`DB update failed: ${error.message}`);

  // 7. Webhook
  if (webhook_url) {
    await deliverWebhook(webhook_url, {
      verification_id,
      status,
      risk_score: riskScore,
      face_match_score: faceMatchScore,
      sanctions_hit: sanctionsHit,
      ...extracted,
    });
  }
}

new Worker<VerificationJobData>("verifications", processVerification, {
  connection,
  concurrency: 5,
});

console.log("Verification worker started");
