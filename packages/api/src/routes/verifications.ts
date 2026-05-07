import { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 as s3Client } from "../lib/aws.js";
import { supabase } from "../lib/supabase.js";
import { addVerificationJob } from "../lib/queue.js";
import { authenticate } from "../middleware/auth.js";

const S3_BUCKET = process.env.AWS_S3_BUCKET!;
if (!S3_BUCKET) throw new Error("Missing AWS_S3_BUCKET env var");

const VerificationSchema = z.object({
  document_front: z.string().min(1, "document_front is required"),
  document_back: z.string().optional(),
  selfie: z.string().min(1, "selfie is required"),
  document_type: z.enum(["passport", "driving_licence", "national_id"]),
  webhook_url: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  applicant_email: z.string().email().optional(),
});

type VerificationBody = z.infer<typeof VerificationSchema>;

async function uploadToS3(
  bucket: string,
  key: string,
  base64Data: string
): Promise<void> {
  const buffer = Buffer.from(base64Data, "base64");
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: "image/jpeg",
    })
  );
}

export async function verificationRoutes(app: FastifyInstance): Promise<void> {
  // POST /v1/verifications
  app.post<{ Body: VerificationBody }>(
    "/v1/verifications",
    { preHandler: authenticate },
    async (request, reply) => {
      try {
        const parsed = VerificationSchema.safeParse(request.body);

        if (!parsed.success) {
          reply.status(400).send({
            error: "Validation failed",
            detail: parsed.error.issues.map((i) => i.message).join("; "),
          });
          return;
        }

        const body = parsed.data;
        const verificationId = randomUUID();
        const prefix = `verifications/${verificationId}`;
        const hasDocumentBack = !!body.document_back;

        // ── Sandbox mode — skip real processing, return mock result ───────────
        if (request.isSandbox) {
          const { error } = await supabase.from("verifications").insert({
            id: verificationId,
            customer_id: request.customerId,
            document_type: body.document_type,
            status: "approved",
            risk_score: 10,
            face_match_score: 0.95,
            sanctions_hit: false,
            webhook_url: body.webhook_url ?? null,
            metadata: body.metadata ?? null,
            applicant_email: body.applicant_email ?? null,
            s3_prefix: prefix,
            is_sandbox: true,
            processed_at: new Date().toISOString(),
          });

          if (error) {
            request.log.error({ err: error }, "Failed to insert sandbox verification");
            reply.status(500).send({ error: "Failed to create verification", detail: error.message });
            return;
          }

          reply.status(200).send({
            verification_id: verificationId,
            status: "approved",
            risk_score: 10,
            face_match_score: 0.95,
            sanctions_hit: false,
            is_sandbox: true,
          });
          return;
        }

        // ── Production mode ───────────────────────────────────────────────────
        await Promise.all([
          uploadToS3(S3_BUCKET, `${prefix}/document_front`, body.document_front),
          hasDocumentBack
            ? uploadToS3(S3_BUCKET, `${prefix}/document_back`, body.document_back!)
            : Promise.resolve(),
          uploadToS3(S3_BUCKET, `${prefix}/selfie`, body.selfie),
        ]);

        const { error } = await supabase.from("verifications").insert({
          id: verificationId,
          customer_id: request.customerId,
          document_type: body.document_type,
          status: "pending",
          webhook_url: body.webhook_url ?? null,
          metadata: body.metadata ?? null,
          applicant_email: body.applicant_email ?? null,
          s3_prefix: prefix,
          is_sandbox: false,
        });

        if (error) {
          request.log.error({ err: error }, "Failed to insert verification");
          reply.status(500).send({ error: "Failed to create verification", detail: error.message });
          return;
        }

        await addVerificationJob({
          verification_id: verificationId,
          customer_id: request.customerId,
          document_type: body.document_type,
          s3_prefix: prefix,
          webhook_url: body.webhook_url ?? null,
          has_document_back: hasDocumentBack,
        });

        reply.status(202).send({
          verification_id: verificationId,
          status: "pending",
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        request.log.error(err);
        reply.status(500).send({ error: "Internal error", detail: message });
      }
    }
  );

  // GET /v1/verifications/:id
  app.get<{ Params: { id: string } }>(
    "/v1/verifications/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id } = request.params;

      const { data, error } = await supabase
        .from("verifications")
        .select(
          `id, status, document_type, risk_score, face_match_score,
           sanctions_hit, full_name, date_of_birth, document_number,
           expiry_date, nationality, webhook_url, metadata,
           created_at, processed_at`
        )
        .eq("id", id)
        .eq("customer_id", request.customerId)
        .single();

      if (error || !data) {
        reply.status(404).send({ error: "Verification not found" });
        return;
      }

      reply.send(data);
    }
  );
}
