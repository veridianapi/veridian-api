import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

function StatusBadge({ status }: { status: string }) {
  const styleMap: Record<string, React.CSSProperties> = {
    approved: { backgroundColor: "rgba(22,163,74,0.15)", color: "#4ade80" },
    review: { backgroundColor: "rgba(251,191,36,0.15)", color: "#fbbf24" },
    rejected: { backgroundColor: "rgba(248,113,113,0.15)", color: "#f87171" },
    pending: { backgroundColor: "rgba(163,179,174,0.15)", color: "#a3b3ae" },
  };
  return (
    <span
      className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
      style={styleMap[status] ?? { backgroundColor: "rgba(163,179,174,0.15)", color: "#a3b3ae" }}
    >
      {status}
    </span>
  );
}

function RiskScore({ score }: { score: number | null }) {
  if (score === null) return <span style={{ color: "#5a7068" }}>—</span>;
  const color =
    score >= 70 ? "#f87171" : score >= 30 ? "#fbbf24" : "#4ade80";
  return <span className="text-sm font-semibold" style={{ color }}>{score}</span>;
}

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
      className="rounded-xl p-6 transition-all duration-150"
      style={{ backgroundColor: "#111916", border: "1px solid #1a2b25" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm mb-1" style={{ color: "#a3b3ae" }}>{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {subtext && (
            <p className="text-xs mt-1" style={{ color: "#5a7068" }}>{subtext}</p>
          )}
        </div>
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

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [
    { data: customer },
    { data: verifications, error: verificationsError },
  ] = await Promise.all([
    supabase.from("customers").select("plan").eq("id", user!.id).single(),
    supabase
      .from("verifications")
      .select("id, status, risk_score, document_type, created_at")
      .eq("customer_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(10),
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

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Overview</h1>
          <p className="text-sm mt-0.5" style={{ color: "#a3b3ae" }}>{today}</p>
        </div>
        {customer?.plan && (
          <span
            className="px-3 py-1.5 rounded-full text-xs font-semibold text-white capitalize"
            style={{ backgroundColor: "rgba(29,158,117,0.20)", color: "#1d9e75" }}
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
          iconColor="#4ade80"
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
          iconColor="#fbbf24"
          iconBg="rgba(251,191,36,0.12)"
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
          iconColor="#f87171"
          iconBg="rgba(248,113,113,0.12)"
          subtext="Failed checks"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Query error banner */}
      {queryError && (
        <div
          className="mb-6 rounded-xl px-5 py-4"
          style={{ backgroundColor: "rgba(220,38,38,0.10)", border: "1px solid rgba(220,38,38,0.25)" }}
        >
          <p className="text-sm font-medium" style={{ color: "#f87171" }}>
            Unable to load verification data. Please refresh the page.
          </p>
        </div>
      )}

      {/* Recent verifications */}
      <div className="rounded-xl" style={{ backgroundColor: "#111916", border: "1px solid #1a2b25" }}>
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid #1a2b25" }}
        >
          <h2 className="text-sm font-semibold text-white">Recent Verifications</h2>
          <Link
            href="/dashboard/verifications"
            className="text-xs font-medium hover:opacity-80 transition-all duration-150"
            style={{ color: "#1d9e75" }}
          >
            View all →
          </Link>
        </div>

        {!verifications || verifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
              style={{ backgroundColor: "rgba(163,179,174,0.08)" }}
            >
              <svg className="w-6 h-6" fill="none" stroke="#a3b3ae" strokeOpacity="0.4" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: "#a3b3ae" }}>No verifications yet</p>
            <p className="text-xs mt-1" style={{ color: "#5a7068" }}>Submitted verifications will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="text-left" style={{ borderBottom: "1px solid #1a2b25" }}>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: "#5a7068" }}>ID</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: "#5a7068" }}>Status</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: "#5a7068" }}>Risk</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: "#5a7068" }}>Document</th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: "#5a7068" }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {verifications.map((v) => (
                  <tr
                    key={v.id}
                    className="last:border-0 transition-all duration-150"
                    style={{ borderBottom: "1px solid #1a2b25" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(29,158,117,0.04)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <td className="px-6 py-3">
                      <Link
                        href={`/dashboard/verifications/${v.id}`}
                        className="font-mono text-xs hover:underline"
                        style={{ color: "#1d9e75" }}
                      >
                        {v.id.slice(0, 8)}…
                      </Link>
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="px-6 py-3">
                      <RiskScore score={v.risk_score} />
                    </td>
                    <td className="px-6 py-3 capitalize text-sm" style={{ color: "#a3b3ae" }}>
                      {v.document_type.replace(/_/g, " ")}
                    </td>
                    <td className="px-6 py-3 text-sm" style={{ color: "#a3b3ae" }}>
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
