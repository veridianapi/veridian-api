import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import OnboardingChecklist from "./OnboardingChecklist";
import AnnouncementBanner from "./AnnouncementBanner";
import QuickActions from "./QuickActions";
import { StatusBadge } from "./_components/StatusBadge";
import { PageHeader } from "./_components/PageHeader";
import { EmptyState } from "./_components/EmptyState";

// ─── Risk score inline (table cell) ──────────────────────────────────────────
function RiskScore({ score }: { score: number | null }) {
  if (score === null) return <span className="vd-risk vd-risk-null">—</span>;
  const level = score >= 70 ? "high" : score >= 30 ? "medium" : "low";
  return (
    <span className={`vd-risk vd-risk-${level}`}>{score}</span>
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
  accentBottom?: boolean;
}

function MetricCard({ label, value, iconColor, iconBg, subtext, icon, accentBottom }: MetricCardProps) {
  return (
    <div
      className="vd-card-metric"
      style={accentBottom ? { borderBottom: "2px solid rgba(29,158,117,0.4)" } : undefined}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="vd-metric-label">{label}</p>
          <p className="vd-metric-value">{value}</p>
          {subtext && <p className="vd-metric-sub">{subtext}</p>}
        </div>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
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
      <AnnouncementBanner />

      <OnboardingChecklist
        hasApiKey={hasApiKey}
        hasVerification={hasVerification}
        hasPaidPlan={hasPaidPlan}
      />

      <PageHeader
        title="Overview"
        subtitle={today}
        action={customer?.plan ? (
          <span className="vd-badge vd-badge-brand" style={{ textTransform: "capitalize" }}>
            {customer.plan} plan
          </span>
        ) : undefined}
      />

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
          accentBottom
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

      <QuickActions hasApiKey={hasApiKey} hasVerification={hasVerification} />

      {queryError && (
        <div className="vd-alert vd-alert-danger mb-6">
          <p className="text-sm font-medium" style={{ color: "#dc2626" }}>
            Unable to load verification data. Please refresh the page.
          </p>
        </div>
      )}

      {/* Recent verifications card */}
      <div className="vd-card-bare">
        <div className="vd-card-head">
          <h2 className="vd-card-title">Recent Verifications</h2>
          <Link href="/dashboard/verifications" className="text-xs font-medium hover:opacity-80" style={{ color: "#1d9e75" }}>
            View all →
          </Link>
        </div>

        {!verifications || verifications.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-5 h-5" fill="none" stroke="#5a7268" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
            title="No verifications yet"
            description="Submit your first API request to see results here."
            action={
              <Link href="/dashboard/help" className="vd-btn vd-btn-primary">
                View API docs
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="vd-table" style={{ minWidth: 600 }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>Document</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {verifications.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <Link href={`/dashboard/verifications/${v.id}`} className="vd-table-id hover:underline">
                        {v.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td><StatusBadge status={v.status} /></td>
                    <td><RiskScore score={v.risk_score} /></td>
                    <td style={{ textTransform: "capitalize", fontSize: 13 }}>
                      {v.document_type.replace(/_/g, " ")}
                    </td>
                    <td style={{ fontSize: 13 }}>
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
