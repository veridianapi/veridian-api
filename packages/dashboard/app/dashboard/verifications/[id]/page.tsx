import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { StatusBadge } from "../../_components/StatusBadge";

function Field({ label, value, mono }: { label: string; value: string | number | null | boolean; mono?: boolean }) {
  const isEmpty = value === null || value === undefined;
  return (
    <div>
      <dt className="text-[11px] font-medium text-[#64748b] uppercase tracking-[0.06em] mb-1">{label}</dt>
      <dd className={mono ? "text-sm font-mono text-[#a8ff78]" : "text-sm text-[#f8fafc]"}>
        {isEmpty ? (
          <span className="text-[#64748b]">—</span>
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: v } = await supabase
    .from("verifications").select("*").eq("id", id).eq("customer_id", user!.id).single();

  if (!v) notFound();

  const riskScore = v.risk_score ?? null;
  const riskLevel = riskScore === null ? "unknown" : riskScore >= 70 ? "high" : riskScore >= 30 ? "medium" : "low";

  const riskColor = riskLevel === "high" ? "text-[#ef4444]" : riskLevel === "medium" ? "text-[#f59e0b]" : riskLevel === "low" ? "text-[#10b981]" : "text-[#64748b]";
  const riskBorderColor = riskLevel === "high" ? "border-t-[#ef4444]" : riskLevel === "medium" ? "border-t-[#f59e0b]" : "border-t-[#10b981]";
  const riskRingBg = riskLevel === "high" ? "bg-[#ef4444]/[0.10]" : riskLevel === "medium" ? "bg-[#f59e0b]/[0.10]" : "bg-[#10b981]/[0.10]";

  const riskDescription =
    riskLevel === "high"   ? "High risk detected. Manual review strongly recommended."
    : riskLevel === "medium" ? "Moderate risk factors present. Additional checks advised."
    : riskLevel === "low"    ? "Low risk. Verification passed standard checks."
    : "Risk score not yet calculated.";

  const faceMatchPct = v.face_match_score !== null ? Math.round(v.face_match_score * 100) : null;
  const faceMatchLevel = faceMatchPct === null ? "null" : faceMatchPct >= 80 ? "low" : faceMatchPct >= 60 ? "medium" : "high";
  const faceMatchColor = faceMatchLevel === "high" ? "text-[#ef4444]" : faceMatchLevel === "medium" ? "text-[#f59e0b]" : faceMatchLevel === "low" ? "text-[#10b981]" : "text-[#64748b]";
  const faceMatchFill  = faceMatchLevel === "high" ? "bg-[#ef4444]"  : faceMatchLevel === "medium" ? "bg-[#f59e0b]"  : faceMatchLevel === "low" ? "bg-[#1d9e75]"  : "bg-[#64748b]";

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-6 text-xs text-[#64748b]">
        <Link href="/dashboard/verifications" className="hover:text-[#94a3b8] transition-colors">Verifications</Link>
        <span>/</span>
        <span className="text-[#94a3b8]">{v.id.slice(0, 8)}…</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-xl font-semibold text-[#f8fafc]">Verification Detail</h1>
        <StatusBadge status={v.status} />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: document + verification details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Document Data */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[#f8fafc] mb-5">
              <svg className="w-4 h-4 shrink-0 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2" />
              </svg>
              Document Data
            </h2>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
              <Field label="Full Name"       value={v.full_name} />
              <Field label="Date of Birth"   value={v.date_of_birth} />
              <Field label="Document Number" value={v.document_number} mono />
              <Field label="Expiry Date"     value={v.expiry_date} />
              <Field label="Nationality"     value={v.nationality} />
              <Field label="Document Type"   value={v.document_type?.replace(/_/g, " ") ?? null} />
            </dl>
          </div>

          {/* Verification Details */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[#f8fafc] mb-5">
              <svg className="w-4 h-4 shrink-0 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Verification Details
            </h2>
            <dl className="grid grid-cols-1 gap-y-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-medium text-[#64748b] uppercase tracking-[0.06em] mb-1">Verification ID</dt>
                <dd className="text-sm font-mono text-[#a8ff78] break-all">{v.id}</dd>
              </div>
              <Field label="Created"   value={new Date(v.created_at).toLocaleString()} />
              <Field label="Processed" value={v.processed_at ? new Date(v.processed_at).toLocaleString() : null} />
            </dl>
          </div>
        </div>

        {/* Right: scores */}
        <div className="space-y-5 lg:sticky lg:top-6">
          {/* Risk Score */}
          <div className={`bg-white/[0.03] border border-white/[0.08] rounded-xl p-6 text-center border-t-[3px] ${riskLevel !== "unknown" ? riskBorderColor : ""}`}>
            <p className="text-[11px] font-medium text-[#64748b] uppercase tracking-[0.06em] mb-3">Risk Score</p>
            <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-semibold tabular-nums ${riskRingBg} ${riskColor}`}>
              {riskScore ?? "—"}
            </div>
            <p className="text-xs text-[#94a3b8]">{riskDescription}</p>
          </div>

          {/* Face Match */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
            <p className="text-[11px] font-medium text-[#64748b] uppercase tracking-[0.06em] mb-3">Face Match</p>
            <p className={`text-2xl font-semibold tabular-nums mb-3 ${faceMatchColor}`}>
              {faceMatchPct !== null ? `${faceMatchPct}%` : "—"}
            </p>
            {faceMatchPct !== null && (
              <div className="h-1 rounded-full bg-white/[0.08]">
                <div className={`h-full rounded-full ${faceMatchFill}`} style={{ width: `${faceMatchPct}%` }} />
              </div>
            )}
          </div>

          {/* Sanctions Check */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
            <p className="text-[11px] font-medium text-[#64748b] uppercase tracking-[0.06em] mb-3">Sanctions Check</p>
            {v.sanctions_hit === null ? (
              <p className="text-sm text-[#64748b]">Not yet checked</p>
            ) : v.sanctions_hit ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#ef4444]/[0.12] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#ef4444]">Match Found</p>
                  <p className="text-xs text-[#64748b]">OFAC / sanctions list hit</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#10b981]/[0.12] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="#10b981" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-[#10b981]">Clear</p>
                  <p className="text-xs text-[#64748b]">No sanctions matches found</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
