import "dotenv/config";
import { Worker, Job } from "bullmq";
import { Redis } from "ioredis";
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

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
if (!WEBHOOK_SECRET) {
  console.warn("WEBHOOK_SECRET is not set — outbound webhook signatures will be empty strings");
}

const S3_BUCKET = process.env.AWS_S3_BUCKET;
if (!S3_BUCKET) {
  throw new Error("Missing AWS_S3_BUCKET env var");
}

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

// Patterns used for KV field matching (substring, case-insensitive)
const FIELD_PATTERNS: Record<keyof ExtractedFields, string[]> = {
  full_name:       ["full name", "surname", "given", "name"],
  date_of_birth:   ["birth", "dob", "born"],
  document_number: ["document number", "doc no", "passport no", "licence no", "id number", "number", "no."],
  expiry_date:     ["expir", "valid until", "validity"],
  nationality:     ["national"],
};

function extractFields(blocks: Block[]): ExtractedFields {
  const blockMap = new Map(blocks.map((b) => [b.Id!, b]));

  // WORD blocks carry text directly on .Text — traversing their Relationships is wrong.
  function wordsText(ids: string[] | undefined): string {
    if (!ids) return "";
    return ids
      .map((id) => blockMap.get(id)?.Text ?? "")
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  // Build key→value pairs from KEY_VALUE_SET blocks
  const kvPairs: Array<{ key: string; value: string }> = [];
  for (const block of blocks) {
    if (block.BlockType !== "KEY_VALUE_SET" || !block.EntityTypes?.includes("KEY")) continue;
    const childIds  = (block.Relationships ?? []).find((r) => r.Type === "CHILD")?.Ids;
    const valueId   = (block.Relationships ?? []).find((r) => r.Type === "VALUE")?.Ids?.[0];
    const valueBlock = valueId ? blockMap.get(valueId) : undefined;
    const valueChildIds = (valueBlock?.Relationships ?? []).find((r) => r.Type === "CHILD")?.Ids;
    const key   = wordsText(childIds).toLowerCase();
    const value = wordsText(valueChildIds);
    if (key) kvPairs.push({ key, value });
  }

  console.log(`[textract] ${kvPairs.length} KV pairs:`, kvPairs.map((p) => `"${p.key}" → "${p.value}"`).join(", "));

  const result: ExtractedFields = {
    full_name: null,
    date_of_birth: null,
    document_number: null,
    expiry_date: null,
    nationality: null,
  };

  for (const field of Object.keys(result) as Array<keyof ExtractedFields>) {
    const patterns = FIELD_PATTERNS[field];
    const match = kvPairs.find(({ key }) => patterns.some((p) => key.includes(p)));
    if (match?.value) result[field] = match.value;
  }

  // MRZ fallback for any fields still null
  const mrzResult = extractFromMRZ(blocks);
  console.log("[textract] MRZ fallback:", mrzResult);
  for (const field of Object.keys(result) as Array<keyof ExtractedFields>) {
    if (!result[field] && mrzResult[field as keyof ExtractedFields]) {
      result[field] = mrzResult[field as keyof ExtractedFields]!;
    }
  }

  return result;
}

// Parse a 6-digit MRZ date (YYMMDD) into ISO format (YYYY-MM-DD)
function parseMRZDate(yymmdd: string, isDOB: boolean): string | null {
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const yy = parseInt(yymmdd.slice(0, 2), 10);
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  let year: number;
  if (isDOB) {
    // If yy > current 2-digit year + 1, person was born last century
    const currentYY = new Date().getFullYear() % 100;
    year = yy > currentYY + 1 ? 1900 + yy : 2000 + yy;
  } else {
    year = 2000 + yy; // Expiry dates on valid documents are always in the 2000s
  }
  return `${year}-${mm}-${dd}`;
}

function extractFromMRZ(blocks: Block[]): Partial<ExtractedFields> {
  // LINE blocks may carry MRZ text; strip spaces since OCR sometimes inserts them
  const lines = blocks
    .filter((b) => b.BlockType === "LINE" && b.Text)
    .map((b) => b.Text!.replace(/\s+/g, "").toUpperCase());

  const result: Partial<ExtractedFields> = {};

  // TD3 — passport: 2 × 44 chars
  const td3L1 = lines.find((l) => l.length === 44 && l[0] === "P");
  const td3L2 = lines.find((l) => l.length === 44 && l !== td3L1 && /^[A-Z0-9<]{44}$/.test(l));

  if (td3L1) {
    // Name: positions 5-43, surname<<given (< = space within segment)
    const [surnameRaw, ...givenParts] = td3L1.slice(5).split("<<");
    const surname = surnameRaw.replace(/</g, " ").trim();
    const given   = givenParts.join(" ").replace(/</g, " ").trim();
    if (surname) result.full_name = given ? `${given} ${surname}` : surname;
  }

  if (td3L2) {
    // Document number: 0-8, strip filler <
    const docNum = td3L2.slice(0, 9).replace(/</g, "").trim();
    if (docNum) result.document_number = docNum;
    // Nationality: 10-12 (ISO 3166-1 alpha-3)
    const nat = td3L2.slice(10, 13).replace(/</g, "").trim();
    if (nat) result.nationality = nat;
    // DOB: 13-18 YYMMDD
    result.date_of_birth = parseMRZDate(td3L2.slice(13, 19), true);
    // Expiry: 21-26 YYMMDD (position 20 is sex)
    result.expiry_date = parseMRZDate(td3L2.slice(21, 27), false);
  }

  // TD1 — national ID / driving licence: 3 × 30 chars
  if (!td3L2) {
    const td1 = lines.filter((l) => l.length === 30 && /^[A-Z0-9<]{30}$/.test(l));
    if (td1.length >= 2) {
      const [l1, l2] = td1;
      const docNum = l1.slice(5, 14).replace(/</g, "").trim();
      if (docNum) result.document_number = docNum;
      const nat = l1.slice(2, 5).replace(/</g, "").trim();
      if (nat) result.nationality = nat;
      result.date_of_birth = parseMRZDate(l2.slice(0, 6), true);
      result.expiry_date   = parseMRZDate(l2.slice(8, 14), false);
    }
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

// ── Legacy single-URL webhook delivery (backward compat) ─────────────────────

async function deliverWebhook(
  url: string,
  payload: Record<string, unknown>
): Promise<void> {
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", WEBHOOK_SECRET ?? "")
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

// ── Per-endpoint webhook delivery ─────────────────────────────────────────────

interface WebhookEndpoint {
  id: string;
  url: string;
  secret: string;
  events: string[];
}

async function deliverToEndpoint(
  endpoint: WebhookEndpoint,
  event: string,
  payload: Record<string, unknown>,
  verificationId: string
): Promise<void> {
  const body = JSON.stringify(payload);
  const signature = `sha256=${createHmac("sha256", endpoint.secret).update(body).digest("hex")}`;

  let statusCode: number | null = null;
  let responseBody: string | null = null;
  let success = false;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Veridian-Signature": signature,
          "X-Veridian-Event": event,
        },
        body,
      });
      statusCode = res.status;
      responseBody = await res.text().catch(() => null);
      if (res.ok) {
        success = true;
        break;
      }
      console.warn(`[webhook ${endpoint.id}] attempt ${attempt + 1} failed: HTTP ${res.status}`);
    } catch (err) {
      console.warn(`[webhook ${endpoint.id}] attempt ${attempt + 1} error:`, err);
    }
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Record delivery in database (best-effort — don't throw)
  try {
    await supabase.from("webhook_deliveries").insert({
      endpoint_id: endpoint.id,
      verification_id: verificationId,
      event,
      payload,
      status_code: statusCode,
      response_body: responseBody,
      success,
      attempted_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[webhook ${endpoint.id}] failed to record delivery:`, err);
  }
}

async function deliverEndpointWebhooks(
  customerId: string,
  verificationId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const { data: endpoints, error } = await supabase
    .from("webhook_endpoints")
    .select("id, url, secret, events")
    .eq("customer_id", customerId)
    .eq("enabled", true);

  if (error || !endpoints?.length) return;

  const matching = endpoints.filter(
    (ep: WebhookEndpoint) => Array.isArray(ep.events) && ep.events.includes(event)
  );

  await Promise.allSettled(
    matching.map((ep: WebhookEndpoint) =>
      deliverToEndpoint(ep, event, payload, verificationId)
    )
  );
}

// ── Worker ────────────────────────────────────────────────────────────────────

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) throw new Error("Missing REDIS_URL env var");

const connection = new Redis(redisUrl, {
  tls: { rejectUnauthorized: false },
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => Math.min(times * 500, 5000),
  reconnectOnError: (err) => err.message.includes("READONLY"),
  connectTimeout: 10000,
  keepAlive: 10000,
  lazyConnect: false,
});

async function processVerification(
  job: Job<VerificationJobData>
): Promise<void> {
  const { verification_id, customer_id, s3_prefix, webhook_url, has_document_back } = job.data;

  let auditAction: "verification.completed" | "verification.failed" = "verification.failed";
  let auditMetadata: Record<string, unknown> = {};

  try {
    // 1. Download images from S3
    const [documentFront, selfie] = await Promise.all([
      downloadFromS3(`${s3_prefix}/document_front`),
      downloadFromS3(`${s3_prefix}/selfie`),
    ]);

    // 2. Textract — extract document fields
    let extracted: ExtractedFields;
    try {
      const textractResponse = await textract.send(
        new AnalyzeDocumentCommand({
          Document: { Bytes: documentFront },
          FeatureTypes: ["FORMS"],
        })
      );
      extracted = extractFields(textractResponse.Blocks ?? []);
    } catch (err) {
      console.warn(`[${verification_id}] Textract failed, continuing with null fields:`, err);
      extracted = {
        full_name: null,
        date_of_birth: null,
        document_number: null,
        expiry_date: null,
        nationality: null,
      };
    }

    // 3. Rekognition — face match
    let faceMatchScore: number;
    if (!documentFront || !selfie) {
      console.warn("[worker] Skipping face match — no images provided");
      faceMatchScore = 0;
    } else {
      try {
        faceMatchScore = await compareFaces(documentFront, selfie);
      } catch (err) {
        console.warn(`[${verification_id}] Rekognition failed, defaulting face score to 0:`, err);
        faceMatchScore = 0;
      }
    }

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

    // 6. Persist results — applicant_email is intentionally omitted to preserve the value set at creation
    const { error: updateError } = await supabase
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
        document_front_key: `${s3_prefix}/document_front`,
        document_back_key: has_document_back ? `${s3_prefix}/document_back` : null,
        selfie_key: `${s3_prefix}/selfie`,
        is_sandbox: false,
      })
      .eq("id", verification_id);

    if (updateError) throw new Error(`DB update failed: ${updateError.message}`);

    auditAction = "verification.completed";
    auditMetadata = { status, risk_score: riskScore, face_match_score: faceMatchScore, sanctions_hit: sanctionsHit };

    // 7. Upsert usage record — increment monthly count
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));

    const { data: existingUsage } = await supabase
      .from("usage_records")
      .select("verification_count")
      .eq("customer_id", customer_id)
      .eq("period_start", periodStart.toISOString())
      .maybeSingle();

    await supabase.from("usage_records").upsert(
      {
        customer_id,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        verification_count: (existingUsage?.verification_count ?? 0) + 1,
      },
      { onConflict: "customer_id,period_start" }
    );

    // 8. Deliver webhooks to registered endpoints
    const webhookPayload = {
      event: "verification.completed",
      verification_id,
      status,
      risk_score: riskScore,
      face_match_score: faceMatchScore,
      sanctions_hit: sanctionsHit,
      created_at: new Date().toISOString(),
    };

    await deliverEndpointWebhooks(
      customer_id,
      verification_id,
      "verification.completed",
      webhookPayload
    );

    // 9. Legacy per-request webhook_url (backward compat)
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
  } catch (err) {
    auditMetadata = { error: err instanceof Error ? err.message : String(err) };
    console.error(`[${verification_id}] processVerification failed:`, err);
    throw err;
  } finally {
    // Insert audit log — best-effort, never throws
    try {
      await supabase.from("audit_logs").insert({
        customer_id,
        actor_type: "system",
        action: auditAction,
        resource_type: "verification",
        resource_id: verification_id,
        metadata: auditMetadata,
      });
    } catch (auditErr) {
      console.error(`[${verification_id}] Failed to write audit log:`, auditErr);
    }
  }
}

const worker = new Worker<VerificationJobData>("verifications", processVerification, {
  connection,
  concurrency: 5,
});

worker.on("error", (err) => {
  console.error("Verification worker error:", err);
});

console.log("Verification worker started");
