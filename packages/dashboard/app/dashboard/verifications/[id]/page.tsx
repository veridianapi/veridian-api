import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null | boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">
        {value === null || value === undefined ? (
          <span className="text-gray-300 font-normal">—</span>
        ) : typeof value === "boolean" ? (
          value ? "Yes" : "No"
        ) : (
          String(value)
        )}
      </dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: "bg-green-100 text-green-700",
    review: "bg-amber-100 text-amber-700",
    rejected: "bg-red-100 text-red-700",
    pending: "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold capitalize ${
        styles[status] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {status}
    </span>
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
    riskScore === null ? "unknown" : riskScore >= 70 ? "high" : riskScore >= 30 ? "medium" : "low";

  const riskColor =
    riskLevel === "high"
      ? "#dc2626"
      : riskLevel === "medium"
      ? "#d97706"
      : riskLevel === "low"
      ? "#16a34a"
      : "#9ca3af";

  const riskBg =
    riskLevel === "high"
      ? "rgba(220,38,38,0.08)"
      : riskLevel === "medium"
      ? "rgba(217,119,6,0.08)"
      : riskLevel === "low"
      ? "rgba(22,163,74,0.08)"
      : "rgba(156,163,175,0.08)";

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
    faceMatchPct === null
      ? "#9ca3af"
      : faceMatchPct >= 80
      ? "#16a34a"
      : faceMatchPct >= 60
      ? "#d97706"
      : "#dc2626";

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-7">
        <Link
          href="/dashboard/verifications"
          className="text-sm text-gray-400 hover:text-gray-700 transition-all duration-150"
        >
          Verifications
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-600 font-mono">{v.id.slice(0, 8)}…</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <h1 className="text-2xl font-bold text-gray-900">Verification Detail</h1>
        <StatusBadge status={v.status} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: 2 columns */}
        <div className="lg:col-span-2 space-y-5">
          {/* Document Data card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2" />
              </svg>
              Document Data
            </h2>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
              <Field label="Full Name" value={v.full_name} />
              <Field label="Date of Birth" value={v.date_of_birth} />
              <Field label="Document Number" value={v.document_number} />
              <Field label="Expiry Date" value={v.expiry_date} />
              <Field label="Nationality" value={v.nationality} />
              <Field
                label="Document Type"
                value={v.document_type?.replace(/_/g, " ") ?? null}
              />
            </dl>
          </div>

          {/* Verification Details card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-5 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Verification Details
            </h2>
            <dl className="grid grid-cols-1 gap-y-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">
                  Verification ID
                </dt>
                <dd className="text-sm font-mono font-medium text-gray-900 break-all">{v.id}</dd>
              </div>
              <Field
                label="Created"
                value={new Date(v.created_at).toLocaleString()}
              />
              <Field
                label="Processed"
                value={
                  v.processed_at
                    ? new Date(v.processed_at).toLocaleString()
                    : null
                }
              />
            </dl>
          </div>
        </div>

        {/* Right: scores sidebar */}
        <div className="space-y-5 lg:sticky lg:top-0">
          {/* Risk Score card */}
          <div
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center"
            style={{ borderTop: `3px solid ${riskColor}` }}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">
              Risk Score
            </p>
            <div
              className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-3 mx-auto"
              style={{ backgroundColor: riskBg }}
            >
              <span
                className="text-3xl font-bold tabular-nums"
                style={{ color: riskColor }}
              >
                {riskScore ?? "—"}
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{riskDescription}</p>
          </div>

          {/* Face Match card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">
              Face Match
            </p>
            <p
              className="text-3xl font-bold tabular-nums mb-3"
              style={{ color: faceMatchColor }}
            >
              {faceMatchPct !== null ? `${faceMatchPct}%` : "—"}
            </p>
            {faceMatchPct !== null && (
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-150"
                  style={{
                    width: `${faceMatchPct}%`,
                    backgroundColor: faceMatchColor,
                  }}
                />
              </div>
            )}
          </div>

          {/* Sanctions card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-3">
              Sanctions Check
            </p>
            {v.sanctions_hit === null ? (
              <p className="text-sm text-gray-400">Not yet checked</p>
            ) : v.sanctions_hit ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-600">Match Found</p>
                  <p className="text-xs text-gray-400">OFAC / sanctions list hit</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-600">Clear</p>
                  <p className="text-xs text-gray-400">No sanctions matches found</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
