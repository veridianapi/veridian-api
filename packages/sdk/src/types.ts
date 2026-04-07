export interface CreateVerificationParams {
  /** Base64-encoded front of the identity document */
  documentFront: string;
  /** Base64-encoded back of the identity document (optional) */
  documentBack?: string;
  /** Base64-encoded selfie image */
  selfie: string;
  /** Type of identity document */
  documentType: "passport" | "driving_licence" | "national_id";
  /** URL to receive webhook notifications when verification completes */
  webhookUrl?: string;
  /** Arbitrary metadata to attach to the verification */
  metadata?: Record<string, unknown>;
}

export interface VerificationResult {
  id: string;
  status: "pending" | "approved" | "review" | "rejected";
  documentType: string;
  /** Risk score 0–100. Higher means more risk. */
  riskScore: number | null;
  /** Face match confidence 0.0–1.0 */
  faceMatchScore: number | null;
  sanctionsHit: boolean | null;
  fullName: string | null;
  dateOfBirth: string | null;
  documentNumber: string | null;
  expiryDate: string | null;
  nationality: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  processedAt: string | null;
}

export interface SubscriptionInfo {
  plan: string | null;
  status: string | null;
  nextBillingDate: string | null;
}

export interface VeridianClientOptions {
  /** Override the default API base URL */
  baseUrl?: string;
}
