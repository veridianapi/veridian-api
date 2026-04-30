import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { StatusBadge } from "../../_components/StatusBadge";

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | number | null | boolean;
  mono?: boolean;
}) {
  const isEmpty = value === null || value === undefined;
  return (
    <div>
      <dt className="vd-field-label">{label}</dt>
      <dd className={mono ? "vd-field-value-mono" : "vd-field-value"}>
        {isEmpty ? (
          <span className="vd-field-empty">—</span>
        ) : typeof value === "boolean" ? (
          value ? "Yes" : "No"
        ) : (
          String(value)
        )}
      </dd>
    </div>
  );
}

export default async function VerificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: v } = await supabase
    .from("verifications")
    .select("*")
    .eq("id", id)
    .eq("customer_id", user!.id)
    .single();

  if (!v) notFound();

  const riskScore = v.risk_score ?? null;
  const riskLevel =
    riskScore === null ? "unknown"
    : riskScore >= 70 ? "high"
    : riskScore >= 30 ? "medium"
    : "low";

  const riskColor =
    riskLevel === "high"    ? "#dc2626"
    : riskLevel === "medium" ? "#d97706"
    : riskLevel === "low"    ? "#16a34a"
    : "#5a7268";

  const riskBg =
    riskLevel === "high"    ? "rgba(220,38,38,0.12)"
    : riskLevel === "medium" ? "rgba(217,119,6,0.12)"
    : riskLevel === "low"    ? "rgba(22,163,74,0.12)"
    : "rgba(255,255,255,0.04)";

  const riskDescription =
    riskLevel === "high"
      ? "High risk detected. Manual review strongly recommended."
      : riskLevel === "medium"
      ? "Moderate risk factors present. Additional checks advised."
      : riskLevel === "low"
      ? "Low risk. Verification passed standard checks."
      : "Risk score not yet calculated.";

  const faceMatchPct =
    v.face_match_score !== null ? Math.round(v.face_match_score * 100) : null;

  const faceMatchColor =
    faceMatchPct === null ? "#5a7268"
    : faceMatchPct >= 80  ? "#16a34a"
    : faceMatchPct >= 60  ? "#d97706"
    : "#dc2626";

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="vd-breadcrumb">
        <Link href="/dashboard/verifications" className="vd-breadcrumb-link">
          Verifications
        </Link>
        <span className="vd-breadcrumb-sep">/</span>
        <span className="vd-breadcrumb-current">{v.id.slice(0, 8)}…</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="vd-page-head-title" style={{ marginBottom: 0 }}>Verification Detail</h1>
        <StatusBadge status={v.status} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: document + verification details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Document Data */}
          <div className="vd-card">
            <h2
              className="flex items-center gap-2 mb-5"
              style={{ fontSize: 14, fontWeight: 600, color: "#f0f4f3" }}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="#5a7268" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2" />
              </svg>
              Document Data
            </h2>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
              <Field label="Full Name"       value={v.full_name} />
              <Field label="Date of Birth"   value={v.date_of_birth} />
              <Field label="Document Number" value={v.document_number} />
              <Field label="Expiry Date"     value={v.expiry_date} />
              <Field label="Nationality"     value={v.nationality} />
              <Field
                label="Document Type"
                value={v.document_type?.replace(/_/g, " ") ?? null}
              />
            </dl>
          </div>

          {/* Verification Details */}
          <div className="vd-card">
            <h2
              className="flex items-center gap-2 mb-5"
              style={{ fontSize: 14, fontWeight: 600, color: "#f0f4f3" }}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="#5a7268" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Verification Details
            </h2>
            <dl className="grid grid-cols-1 gap-y-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="vd-field-label">Verification ID</dt>
                <dd className="vd-field-value-mono" style={{ fontSize: 14, fontWeight: 500, color: "#f0f4f3" }}>
                  {v.id}
                </dd>
              </div>
              <Field label="Created"   value={new Date(v.created_at).toLocaleString()} />
              <Field label="Processed" value={v.processed_at ? new Date(v.processed_at).toLocaleString() : null} />
            </dl>
          </div>
        </div>

        {/* Right: scores */}
        <div className="space-y-5 lg:sticky lg:top-0">
          {/* Risk Score */}
          <div
            className="vd-card text-center"
            style={{ borderTop: `3px solid ${riskColor}` }}
          >
            <p className="vd-field-label" style={{ marginBottom: 12 }}>Risk Score</p>
            <div
              className={`vd-risk-circle mx-auto mb-3 vd-risk-${riskLevel === "unknown" ? "null" : riskLevel}`}
              style={{ backgroundColor: riskBg }}
            >
              {riskScore ?? "—"}
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.5, color: "#a3b3ae" }}>
              {riskDescription}
            </p>
          </div>

          {/* Face Match */}
          <div className="vd-card">
            <p className="vd-field-label" style={{ marginBottom: 12 }}>Face Match</p>
            <p
              style={{
                fontSize: 32,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: faceMatchColor,
                marginBottom: 12,
                lineHeight: 1.2,
              }}
            >
              {faceMatchPct !== null ? `${faceMatchPct}%` : "—"}
            </p>
            {faceMatchPct !== null && (
              <div className="vd-progress-track">
                <div
                  className="vd-progress-fill"
                  style={{ width: `${faceMatchPct}%`, backgroundColor: faceMatchColor }}
                />
              </div>
            )}
          </div>

          {/* Sanctions Check */}
          <div className="vd-card">
            <p className="vd-field-label" style={{ marginBottom: 12 }}>Sanctions Check</p>
            {v.sanctions_hit === null ? (
              <p style={{ fontSize: 14, color: "#a3b3ae" }}>Not yet checked</p>
            ) : v.sanctions_hit ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(220,38,38,0.12)" }}>
                  <svg className="w-4 h-4" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#dc2626" }}>Match Found</p>
                  <p style={{ fontSize: 12, color: "#a3b3ae" }}>OFAC / sanctions list hit</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(22,163,74,0.12)" }}>
                  <svg className="w-4 h-4" fill="none" stroke="#16a34a" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#16a34a" }}>Clear</p>
                  <p style={{ fontSize: 12, color: "#a3b3ae" }}>No sanctions matches found</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
