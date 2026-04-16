import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import OnboardingChecklist from "./OnboardingChecklist";
import AnnouncementBanner from "./AnnouncementBanner";
import QuickActions from "./QuickActions";

// ─── Status badge ─────────────────────────────────────────────────────────────
// Colors follow DESIGN.md §5 Badges & Status Pills exactly.
function StatusBadge({ status }: { status: string }) {
  const styleMap: Record<string, React.CSSProperties> = {
    approved: { backgroundColor: "rgba(22,163,74,0.12)",   color: "#16a34a" },
    review:   { backgroundColor: "rgba(217,119,6,0.12)",   color: "#d97706" },
    rejected: { backgroundColor: "rgba(220,38,38,0.12)",   color: "#dc2626" },
    pending:  { backgroundColor: "rgba(255,255,255,0.06)", color: "#5a7268" },
  };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0px 6px",
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 510,
        letterSpacing: "0.02em",
        textTransform: "capitalize",
        ...(styleMap[status] ?? { backgroundColor: "rgba(255,255,255,0.06)", color: "#5a7268" }),
      }}
    >
      {status}
    </span>
  );
}

// ─── Risk score ───────────────────────────────────────────────────────────────
function RiskScore({ score }: { score: number | null }) {
  if (score === null) return <span style={{ color: "#5a7268" }}>—</span>;
  const color =
    score >= 70 ? "#dc2626" : score >= 30 ? "#d97706" : "#16a34a";
  return (
    <span
      className="text-sm font-semibold"
      style={{ color, fontVariantNumeric: "tabular-nums" }}
    >
      {score}
    </span>
  );
}

// ─── Metric card ─────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: number;
  iconColor: string;
  iconBg: string;
  subtext?: string;
  icon: React.ReactNode;
}

function MetricCard({ label, value, iconColor, iconBg, subtext, icon }: MetricCardProps) {
  return (
    <div
      className="card-lift rounded-xl p-6 transition-colors duration-150"
      style={{
        backgroundColor: "#111916",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          {/* Label: 12px, weight 500, uppercase, #5a7268, letter-spacing 0.06em */}
          <p
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "#5a7268",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            {label}
          </p>
          {/* Value: 32px, weight 600, tabular-nums */}
          <p
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: "#f0f4f3",
              lineHeight: 1.2,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.704px",
            }}
          >
            {value}
          </p>
          {subtext && (
            <p className="text-xs mt-1" style={{ color: "#5a7268" }}>{subtext}</p>
          )}
        </div>
        {/* Icon: 40px circle */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: customer },
    { data: verifications, error: verificationsError },
    { count: apiKeyCount },
  ] = await Promise.all([
    supabase.from("customers").select("plan").eq("id", user!.id).single(),
    supabase
      .from("verifications")
      .select("id, status, risk_score, document_type, created_at")
      .eq("customer_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", user!.id),
  ]);

  const { data: counts, error: countsError } = await supabase
    .from("verifications")
    .select("status")
    .eq("customer_id", user!.id);

  const queryError = countsError || verificationsError;

  const tally = (counts ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const paidPlans = ["starter", "growth", "scale"];
  const hasPaidPlan = paidPlans.includes(customer?.plan ?? "");

  const hasApiKey = (apiKeyCount ?? 0) > 0;
  const hasVerification = (counts ?? []).length > 0;

  return (
    <div>
      {/* Announcement banner — dismissible, state persisted in localStorage */}
      <AnnouncementBanner />

      {/* Onboarding checklist — shown to new users until dismissed */}
      <OnboardingChecklist
        hasApiKey={hasApiKey}
        hasVerification={hasVerification}
        hasPaidPlan={hasPaidPlan}
      />

      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#f0f4f3", letterSpacing: "-0.704px" }}>Overview</h1>
          <p className="text-sm mt-1" style={{ color: "#a3b3ae" }}>{today}</p>
        </div>
        {customer?.plan && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0px 6px",
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 510,
              letterSpacing: "0.02em",
              backgroundColor: "rgba(29,158,117,0.15)",
              color: "#1d9e75",
              textTransform: "capitalize",
            }}
          >
            {customer.plan} plan
          </span>
        )}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-8">
        <MetricCard
          label="Total"
          value={(counts ?? []).length}
          iconColor="#1d9e75"
          iconBg="rgba(29,158,117,0.12)"
          subtext="All time"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <MetricCard
          label="Approved"
          value={tally.approved ?? 0}
          iconColor="#16a34a"
          iconBg="rgba(22,163,74,0.12)"
          subtext="Verified identities"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <MetricCard
          label="Under Review"
          value={tally.review ?? 0}
          iconColor="#d97706"
          iconBg="rgba(217,119,6,0.12)"
          subtext="Needs attention"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
        <MetricCard
          label="Rejected"
          value={tally.rejected ?? 0}
          iconColor="#dc2626"
          iconBg="rgba(220,38,38,0.12)"
          subtext="Failed checks"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Quick actions — hidden once user has ≥1 API key AND ≥1 verification */}
      <QuickActions hasApiKey={hasApiKey} hasVerification={hasVerification} />

      {/* Query error banner */}
      {queryError && (
        <div
          className="mb-6 rounded-xl px-5 py-4"
          style={{
            backgroundColor: "rgba(220,38,38,0.10)",
            border: "1px solid rgba(220,38,38,0.25)",
            borderLeft: "3px solid #dc2626",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "#dc2626" }}>
            Unable to load verification data. Please refresh the page.
          </p>
        </div>
      )}

      {/* Recent verifications card */}
      <div
        className="card-lift rounded-xl"
        style={{ backgroundColor: "#111916", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h2 className="text-sm font-semibold" style={{ color: "#f0f4f3", letterSpacing: "-0.288px" }}>
            Recent Verifications
          </h2>
          <Link
            href="/dashboard/verifications"
            className="text-xs font-medium hover:opacity-80"
            style={{ color: "#1d9e75" }}
          >
            View all →
          </Link>
        </div>

        {!verifications || verifications.length === 0 ? (
          /* Empty state: icon + headline + description + action (DESIGN.md §8) */
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="#5a7268" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="text-base font-medium mb-1" style={{ color: "#a3b3ae" }}>
              No verifications yet
            </p>
            <p className="text-sm mb-4" style={{ color: "#5a7268" }}>
              Submit your first API request to see results here.
            </p>
            <Link
              href="/dashboard/help"
              className="inline-flex items-center gap-2 px-4 py-0 rounded-lg text-[13px] font-medium"
              style={{
                backgroundColor: "#1d9e75",
                color: "#050a09",
                height: 36,
                lineHeight: "36px",
                borderRadius: 8,
              }}
            >
              View API docs
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]" style={{ borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  {["ID", "Status", "Risk", "Document", "Created"].map((col) => (
                    <th
                      key={col}
                      className="text-left"
                      style={{
                        padding: "12px 16px",
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#5a7268",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {verifications.map((v, idx) => (
                  <tr
                    key={v.id}
                    className="hover:bg-[rgba(255,255,255,0.02)] transition-colors duration-150"
                    style={{
                      borderBottom:
                        idx < verifications.length - 1
                          ? "1px solid rgba(255,255,255,0.04)"
                          : "none",
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <Link
                        href={`/dashboard/verifications/${v.id}`}
                        className="hover:underline"
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          color: "#1d9e75",
                        }}
                      >
                        {v.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <StatusBadge status={v.status} />
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <RiskScore score={v.risk_score} />
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        color: "#a3b3ae",
                        textTransform: "capitalize",
                        fontSize: 13,
                      }}
                    >
                      {v.document_type.replace(/_/g, " ")}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#a3b3ae", fontSize: 13 }}>
                      {new Date(v.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
