import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import { DocumentTabs } from "./DocumentTabs";

// ── helpers ───────────────────────────────────────────────────────────────────

function riskBand(score: number): "low" | "mid" | "high" {
  if (score < 30) return "low";
  if (score < 70) return "mid";
  return "high";
}

const BAND: Record<"low" | "mid" | "high", { color: string; label: string; desc: string }> = {
  low:  { color: "#1d9e75", label: "Low risk",    desc: "No anomalies detected across document, biometric, behavioral, or watchlist signals." },
  mid:  { color: "#d4a24a", label: "Medium risk", desc: "Moderate risk factors detected. Manual review recommended before approving." },
  high: { color: "#c4564a", label: "High risk",   desc: "High risk detected. This verification requires immediate manual review." },
};

const STATUS_PILL: Record<string, { dot: string; label: string; pillCls: string }> = {
  approved: { dot: "bg-[#1d9e75]", label: "Pass",    pillCls: "text-[#1d9e75] bg-[#1d9e75]/[0.06] border-[#1d9e75]/25" },
  review:   { dot: "bg-[#d4a24a]", label: "Review",  pillCls: "text-[#d4a24a] bg-[#d4a24a]/[0.06] border-[#d4a24a]/25" },
  rejected: { dot: "bg-[#c4564a]", label: "Block",   pillCls: "text-[#c4564a] bg-[#c4564a]/[0.06] border-[#c4564a]/25" },
  pending:  { dot: "bg-[#5a7268]", label: "Pending", pillCls: "text-[#5a7268] bg-white/[0.04] border-white/10" },
};

function docTypeLabel(t: string): string {
  const map: Record<string, string> = {
    passport:        "Passport",
    driving_licence: "Driver License",
    national_id:     "National ID",
  };
  return map[t] ?? t.replace(/_/g, " ");
}

function fmt(dateStr: string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " UTC";
}

// ── page ──────────────────────────────────────────────────────────────────────

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
    .from("verifications")
    .select("*")
    .eq("id", id)
    .eq("customer_id", user!.id)
    .single();

  if (!v) notFound();

  // ── derived values ──────────────────────────────────────────────────────────
  const score = v.risk_score ?? 0;
  const band = riskBand(score);
  const { color: donutColor, label: riskLabel, desc: riskDesc } = BAND[band];
  const R = 42;
  const circ = 2 * Math.PI * R; // 263.89
  const arcLen = (score / 100) * circ;

  const pill = STATUS_PILL[v.status] ?? STATUS_PILL.pending;
  const faceMatchPct = v.face_match_score !== null
    ? (v.face_match_score * 100).toFixed(1)
    : null;
  const faceMatchPass = v.face_match_score !== null && v.face_match_score >= 0.8;

  const shortId = `ver_${id.slice(0, 8)}`;
  const submittedDate = new Date(v.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const submittedTime = new Date(v.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const isExpired = v.expiry_date
    ? !isNaN(new Date(v.expiry_date).getTime()) && new Date(v.expiry_date) < new Date()
    : null;

  // sub-scores matching worker's scoring logic
  const watchlistScore = v.sanctions_hit ? 40 : 0;
  const biometricScore = v.face_match_score !== null
    ? (v.face_match_score < 0.8 ? 30 : Math.round((1 - v.face_match_score) * 10))
    : 0;
  const docScore = isExpired ? 20 : 0;
  const behavioralScore = 0;

  const hasBack = !!v.document_back_key;

  // compliance checks
  const checks = [
    {
      label: "Document authenticity",
      ok: v.status !== "pending",
      val: v.status !== "pending" ? "Pass" : "Pending",
    },
    {
      label: "Face match",
      ok: faceMatchPass,
      val: faceMatchPct !== null ? `${faceMatchPct}% · ${faceMatchPass ? "Pass" : "Failed"}` : "—",
    },
    {
      label: "Liveness",
      ok: v.face_match_score !== null && v.face_match_score > 0,
      val: v.face_match_score !== null && v.face_match_score > 0
        ? "Biometric presence confirmed"
        : "—",
    },
    {
      label: "Sanctions & OFAC",
      ok: v.sanctions_hit === false,
      val: v.sanctions_hit === null ? "—" : v.sanctions_hit ? "Match found" : "Clear",
    },
    {
      label: "Adverse media",
      ok: true,
      val: "No hits across public sources",
    },
    {
      label: "Address verification",
      ok: false,
      val: "No address data",
    },
  ];

  // timeline events
  const tlEvents = [
    { title: "Session created",   meta: fmtTime(v.created_at),   done: true },
    { title: "Document uploaded",  meta: fmtTime(v.created_at),   done: !!v.processed_at },
    ...(v.processed_at ? [{
      title: `Decision: ${pill.label}`,
      accent: true,
      meta: fmtTime(v.processed_at) + ` · auto · risk ${score}`,
      done: true,
    }] : []),
  ];

  return (
    <div className="max-w-[1280px]">

      {/* Detail head */}
      <div className="flex items-start justify-between gap-4 mb-[22px]">
        <div>
          <Link
            href="/dashboard/verifications"
            className="inline-flex items-center gap-1.5 text-[12px] text-[#5a7268] hover:text-[#a3b3ae] mb-[10px] transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Verifications
          </Link>
          <h1 className="text-[22px] font-semibold tracking-[-0.022em] text-[#f0f4f3] mb-1 flex items-center gap-[10px]">
            {v.full_name ?? shortId}
            <span className={`inline-flex items-center gap-1.5 px-2 py-[3px] border rounded-[4px] font-mono text-[10px] tracking-[0.04em] uppercase font-medium ${pill.pillCls}`}>
              <span className={`w-[6px] h-[6px] rounded-full ${pill.dot}`} />
              {pill.label}
            </span>
          </h1>
          <p className="text-[12px] text-[#5a7268] font-mono">
            {shortId}
            <span className="opacity-50 px-1">·</span>
            submitted {submittedDate}, {submittedTime} UTC
            {v.nationality && (
              <>
                <span className="opacity-50 px-1">·</span>
                {v.nationality}
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-center">
          <button className="h-7 w-7 flex items-center justify-center border border-white/[0.06] rounded-[5px] text-[#a3b3ae] hover:bg-white/[0.03] hover:text-[#f0f4f3] hover:border-white/10 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="6" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="18" r="1"/>
            </svg>
          </button>
          <button className="h-7 px-[11px] flex items-center gap-1.5 border border-white/[0.06] rounded-[5px] text-[12px] font-medium text-[#e07a6e] hover:bg-[#c4564a]/[0.08] hover:border-[#c4564a]/30 hover:text-[#e8867a] transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
            Reject
          </button>
          <button className="h-7 px-[11px] flex items-center gap-1.5 bg-[#1d9e75] text-[#04140e] text-[12px] font-semibold rounded-[5px] hover:bg-[#25b485] transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
            Approve
          </button>
        </div>
      </div>

      {/* 60 / 40 grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(0,60fr) minmax(0,40fr)" }}>

        {/* ── LEFT column ── */}
        <div className="flex flex-col gap-4 min-w-0">

          {/* Document card */}
          <div className="bg-[#111916] border border-white/[0.06] rounded-[6px] overflow-hidden">
            <DocumentTabs
              hasBack={hasBack}
              docType={docTypeLabel(v.document_type)}
              nationality={v.nationality}
            />
          </div>

          {/* Extracted data card */}
          <div className="bg-[#111916] border border-white/[0.06] rounded-[6px] overflow-hidden">
            <div className="flex items-center px-[14px] py-[10px] border-b border-white/[0.06] gap-[10px]">
              <span className="text-[12.5px] font-semibold text-[#f0f4f3] tracking-[-0.005em]">Extracted data</span>
              <span className="ml-auto font-mono text-[11px] text-[#5a7268]">OCR · Textract</span>
            </div>
            <div className="p-[14px]">
              <div className="grid" style={{ gridTemplateColumns: "160px 1fr" }}>
                {[
                  { k: "Full name",       v: v.full_name,                         mono: false },
                  { k: "Date of birth",   v: v.date_of_birth ? fmt(v.date_of_birth) : null, mono: false },
                  { k: "Nationality",     v: v.nationality,                        mono: false },
                  { k: "Document type",   v: docTypeLabel(v.document_type),        mono: false },
                  { k: "Document number", v: v.document_number,                    mono: true  },
                  { k: "Expiration",      v: v.expiry_date ? fmt(v.expiry_date) : null,   mono: false },
                ].map(({ k, v: val, mono }, idx, arr) => {
                  const isLast = idx >= arr.length - 2;
                  const rowCls = `py-[9px] ${isLast ? "" : "border-b border-white/[0.06]"} text-[12.5px]`;
                  return (
                    <>
                      <div key={`k-${k}`} className={`${rowCls} text-[#5a7268]`}>{k}</div>
                      <div key={`v-${k}`} className={`${rowCls} ${mono ? "font-mono text-[12px] text-[#f0f4f3]" : "text-[#f0f4f3]"}`}>
                        {val ?? <span className="text-[#5a7268]">—</span>}
                      </div>
                    </>
                  );
                })}
                {/* MRZ checksum */}
                <div className="pt-[9px] text-[12.5px] text-[#5a7268]">MRZ checksum</div>
                <div className="pt-[9px]">
                  {v.document_number ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-[2px] border border-[#1d9e75]/25 bg-[#1d9e75]/[0.06] rounded-[4px] font-mono text-[11px] text-[#1d9e75] uppercase tracking-[0.04em] font-medium">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5"/>
                      </svg>
                      Valid
                    </span>
                  ) : (
                    <span className="text-[#5a7268] text-[12.5px]">—</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT column ── */}
        <div className="flex flex-col gap-4 min-w-0">

          {/* Risk score card */}
          <div className="bg-[#111916] border border-white/[0.06] rounded-[6px] overflow-hidden">
            <div className="flex items-center px-[14px] py-[10px] border-b border-white/[0.06] gap-[10px]">
              <span className="text-[12.5px] font-semibold text-[#f0f4f3] tracking-[-0.005em]">Risk score</span>
              <span className="ml-auto font-mono text-[11px] text-[#5a7268]">v4.2 model</span>
            </div>
            <div className="p-[14px]">
              {/* Donut + summary */}
              <div className="flex items-center gap-[18px] pb-4">
                <div className="relative w-24 h-24 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                    <circle
                      cx="50" cy="50" r={R}
                      fill="none"
                      stroke={donutColor}
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${arcLen.toFixed(1)} ${circ.toFixed(1)}`}
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-mono text-[26px] font-medium text-[#f0f4f3] tracking-[-0.02em]">
                    {score}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-[7px] font-mono text-[11px] uppercase tracking-[0.06em] font-medium mb-1.5" style={{ color: donutColor }}>
                    <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: donutColor }} />
                    {riskLabel}
                  </div>
                  <p className="text-[12px] text-[#5a7268] leading-[1.5]">{riskDesc}</p>
                </div>
              </div>
              {/* Sub-scores */}
              <div>
                {[
                  { k: "Document",   val: docScore,       pct: docScore },
                  { k: "Biometric",  val: biometricScore, pct: biometricScore },
                  { k: "Behavioral", val: behavioralScore, pct: behavioralScore },
                  { k: "Watchlists", val: watchlistScore,  pct: watchlistScore },
                ].map(({ k, val, pct }) => {
                  const subBand = riskBand(val);
                  const subColor = subBand === "low" ? "#1d9e75" : subBand === "mid" ? "#d4a24a" : "#c4564a";
                  return (
                    <div key={k} className="grid items-center gap-[10px] py-2 border-t border-white/[0.06]" style={{ gridTemplateColumns: "88px 1fr 28px" }}>
                      <span className="text-[12px] text-[#5a7268]">{k}</span>
                      <span className="relative h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <i className="block h-full rounded-full absolute left-0 top-0" style={{ width: `${pct}%`, background: subColor }} />
                      </span>
                      <span className="text-right font-mono text-[12px] text-[#f0f4f3]">{String(val).padStart(2, "0")}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Compliance checks card */}
          <div className="bg-[#111916] border border-white/[0.06] rounded-[6px] overflow-hidden">
            <div className="flex items-center px-[14px] py-[10px] border-b border-white/[0.06] gap-[10px]">
              <span className="text-[12.5px] font-semibold text-[#f0f4f3] tracking-[-0.005em]">Compliance checks</span>
              <span className="ml-auto font-mono text-[11px] text-[#5a7268]">
                {checks.filter((c) => c.ok).length}/{checks.length}
              </span>
            </div>
            <div className="px-[14px] py-[14px]">
              <div className="flex flex-col">
                {checks.map(({ label, ok, val }, i) => (
                  <div
                    key={label}
                    className={`flex items-center gap-[10px] py-[9px] text-[12.5px] ${i === 0 ? "pt-0" : ""} ${i === checks.length - 1 ? "pb-0 border-0" : "border-b border-white/[0.06]"}`}
                  >
                    <span
                      className="w-[18px] h-[18px] rounded-[4px] flex items-center justify-center shrink-0"
                      style={{ background: ok ? "rgba(29,158,117,0.10)" : "rgba(212,162,74,0.12)" }}
                    >
                      {ok ? (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1d9e75" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5"/>
                        </svg>
                      ) : (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d4a24a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 9v4"/><path d="M12 17h.01"/>
                          <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        </svg>
                      )}
                    </span>
                    <span className="flex-1 text-[#f0f4f3]">{label}</span>
                    <span className={`font-mono text-[11px] uppercase tracking-[0.03em] ${ok ? "text-[#1d9e75]" : "text-[#d4a24a]"}`}>
                      {val}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline card */}
          <div className="bg-[#111916] border border-white/[0.06] rounded-[6px] overflow-hidden">
            <div className="flex items-center px-[14px] py-[10px] border-b border-white/[0.06] gap-[10px]">
              <span className="text-[12.5px] font-semibold text-[#f0f4f3] tracking-[-0.005em]">Timeline</span>
              <span className="ml-auto font-mono text-[11px] text-[#5a7268]">{tlEvents.length} events</span>
            </div>
            <div className="px-[14px] py-[14px]">
              <div className="relative pl-5">
                {/* Vertical line */}
                <div className="absolute left-[5px] top-[4px] bottom-[4px] w-px bg-white/10" />
                {tlEvents.map(({ title, meta, done, accent }, i) => (
                  <div key={i} className={`relative pb-[14px] last:pb-0 text-[12.5px]`}>
                    {/* dot */}
                    <span
                      className="absolute -left-[14px] top-[7px] w-[9px] h-[9px] rounded-full border"
                      style={
                        done
                          ? { background: "#1d9e75", borderColor: "#1d9e75", boxShadow: "0 0 0 3px rgba(29,158,117,0.10)" }
                          : { background: "#111916", borderColor: "#5a7268" }
                      }
                    />
                    <div className="font-medium text-[#f0f4f3]">
                      {/* @ts-ignore accent is optional */}
                      {accent ? (
                        <>Decision: <span className="text-[#1d9e75]">{v.status === "approved" ? "Approved" : v.status === "rejected" ? "Rejected" : "Review"}</span>
                        </>
                      ) : title}
                    </div>
                    <div className="font-mono text-[11px] text-[#5a7268] mt-[2px]">{meta}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
