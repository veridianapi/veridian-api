import { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3 as s3Client } from "../lib/aws.js";
import { supabase } from "../lib/supabase.js";
import { addVerificationJob } from "../lib/queue.js";
import { authenticate } from "../middleware/auth.js";

const VerificationSchema = z.object({
  document_front: z.string().min(1, "document_front is required"),
  document_back: z.string().optional(),
  selfie: z.string().min(1, "selfie is required"),
  document_type: z.enum(["passport", "driving_licence", "national_id"]),
  webhook_url: z.string().url().optional(),
   metadata: z.record(z.string(), z.unknown()).optional(),
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
            details: parsed.error.issues,
          });
          return;
        }

        const body = parsed.data;
        const verificationId = randomUUID();
        const bucket = process.env.AWS_S3_BUCKET!;
        const prefix = `verifications/${verificationId}`;

        await Promise.all([
          uploadToS3(bucket, `${prefix}/document_front`, body.document_front),
          body.document_back
            ? uploadToS3(bucket, `${prefix}/document_back`, body.document_back)
            : Promise.resolve(),
          uploadToS3(bucket, `${prefix}/selfie`, body.selfie),
        ]);

        const { error } = await supabase.from("verifications").insert({
          id: verificationId,
          customer_id: request.customerId,
          document_type: body.document_type,
          status: "pending",
          webhook_url: body.webhook_url ?? null,
          metadata: body.metadata ?? null,
          s3_prefix: prefix,
        });

        if (error) {
          reply.status(500).send({ error: "Failed to create verification" });
          return;
        }

        await addVerificationJob({
          verification_id: verificationId,
          customer_id: request.customerId,
          document_type: body.document_type,
          s3_prefix: prefix,
          webhook_url: body.webhook_url ?? null,
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
