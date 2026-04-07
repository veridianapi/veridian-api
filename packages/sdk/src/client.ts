import { VeridianError } from "./errors.js";
import type {
  CreateVerificationParams,
  VerificationResult,
  SubscriptionInfo,
  VeridianClientOptions,
} from "./types.js";

const DEFAULT_BASE_URL = "https://api.veridian.io";

export class VeridianClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(apiKey: string, options: VeridianClientOptions = {}) {
    if (!apiKey) throw new Error("apiKey is required");
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl?.replace(/\/$/, "") ?? DEFAULT_BASE_URL;
  }

  async createVerification(
    params: CreateVerificationParams
  ): Promise<{ verificationId: string; status: "pending" }> {
    const body = {
      document_front: params.documentFront,
      document_back: params.documentBack,
      selfie: params.selfie,
      document_type: params.documentType,
      webhook_url: params.webhookUrl,
      metadata: params.metadata,
    };

    const data = await this.request<{
      verification_id: string;
      status: "pending";
    }>("POST", "/v1/verifications", body);

    return { verificationId: data.verification_id, status: data.status };
  }

  async getVerification(id: string): Promise<VerificationResult> {
    const data = await this.request<{
      id: string;
      status: string;
      document_type: string;
      risk_score: number | null;
      face_match_score: number | null;
      sanctions_hit: boolean | null;
      full_name: string | null;
      date_of_birth: string | null;
      document_number: string | null;
      expiry_date: string | null;
      nationality: string | null;
      metadata: Record<string, unknown> | null;
      created_at: string;
      processed_at: string | null;
    }>("GET", `/v1/verifications/${id}`);

    return {
      id: data.id,
      status: data.status as VerificationResult["status"],
      documentType: data.document_type,
      riskScore: data.risk_score,
      faceMatchScore: data.face_match_score,
      sanctionsHit: data.sanctions_hit,
      fullName: data.full_name,
      dateOfBirth: data.date_of_birth,
      documentNumber: data.document_number,
      expiryDate: data.expiry_date,
      nationality: data.nationality,
      metadata: data.metadata,
      createdAt: data.created_at,
      processedAt: data.processed_at,
    };
  }

  async getSubscription(): Promise<SubscriptionInfo> {
    const data = await this.request<{
      plan: string | null;
      status: string | null;
      next_billing_date: string | null;
    }>("GET", "/v1/billing/subscription");

    return {
      plan: data.plan,
      status: data.status,
      nextBillingDate: data.next_billing_date,
    };
  }

  async createCheckout(
    plan: "starter" | "growth" | "scale"
  ): Promise<{ checkoutUrl: string }> {
    const data = await this.request<{ checkout_url: string }>(
      "POST",
      "/v1/billing/checkout",
      { plan }
    );
    return { checkoutUrl: data.checkout_url };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let payload: unknown;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      payload = await response.json();
    } else {
      payload = await response.text();
    }

    if (!response.ok) {
      const err = payload as { error?: string; detail?: string };
      throw new VeridianError(
        err.error ?? `HTTP ${response.status}`,
        response.status,
        err.detail ?? response.statusText
      );
    }

    return payload as T;
  }
}
