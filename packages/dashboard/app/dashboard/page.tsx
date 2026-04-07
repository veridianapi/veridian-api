import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: "bg-green-100 text-green-700",
    review: "bg-amber-100 text-amber-700",
    rejected: "bg-red-100 text-red-700",
    pending: "bg-gray-100 text-gray-500",
  };
  return (
    <span
      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
        styles[status] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {status}
    </span>
  );
}

function RiskScore({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-300">—</span>;
  const color =
    score >= 70
      ? "text-red-600"
      : score >= 30
      ? "text-amber-600"
      : "text-green-600";
  return <span className={`text-sm font-semibold ${color}`}>{score}</span>;
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
    <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-150">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtext && (
            <p className="text-xs text-gray-400 mt-1">{subtext}</p>
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

  const [{ data: customer }, { data: verifications }] = await Promise.all([
    supabase.from("customers").select("plan").eq("id", user!.id).single(),
    supabase
      .from("verifications")
      .select("id, status, risk_score, document_type, created_at")
      .eq("customer_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const { data: counts } = await supabase
    .from("verifications")
    .select("status")
    .eq("customer_id", user!.id);

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
          <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
          <p className="text-sm text-gray-400 mt-0.5">{today}</p>
        </div>
        {customer?.plan && (
          <span
            className="px-3 py-1.5 rounded-full text-xs font-semibold text-white capitalize"
            style={{ backgroundColor: "#0f6e56" }}
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
          iconColor="#0f6e56"
          iconBg="rgba(15,110,86,0.10)"
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
          iconBg="rgba(22,163,74,0.10)"
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
          iconBg="rgba(217,119,6,0.10)"
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
          iconBg="rgba(220,38,38,0.10)"
          subtext="Failed checks"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Recent verifications */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Recent Verifications</h2>
          <Link
            href="/dashboard/verifications"
            className="text-xs font-medium hover:text-gray-900 transition-all duration-150"
            style={{ color: "#0f6e56" }}
          >
            View all →
          </Link>
        </div>

        {!verifications || verifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-400">No verifications yet</p>
            <p className="text-xs text-gray-300 mt-1">Submitted verifications will appear here</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-50">
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-gray-400">ID</th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-gray-400">Status</th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-gray-400">Risk</th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-gray-400">Document</th>
                <th className="px-6 py-3 text-xs font-medium uppercase tracking-wide text-gray-400">Created</th>
              </tr>
            </thead>
            <tbody>
              {verifications.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-all duration-150"
                >
                  <td className="px-6 py-3">
                    <Link
                      href={`/dashboard/verifications/${v.id}`}
                      className="font-mono text-xs hover:underline"
                      style={{ color: "#0f6e56" }}
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
                  <td className="px-6 py-3 text-gray-600 capitalize text-sm">
                    {v.document_type.replace(/_/g, " ")}
                  </td>
                  <td className="px-6 py-3 text-gray-400 text-sm">
                    {new Date(v.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
