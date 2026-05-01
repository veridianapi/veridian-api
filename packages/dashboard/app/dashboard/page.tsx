import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { VerificationsTable } from "./_components/VerificationsTable";
import OnboardingChecklist from "./OnboardingChecklist";
import AnnouncementBanner from "./AnnouncementBanner";

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: "brand" | "success" | "warning" | "danger";
}) {
  const accentColor = {
    brand:   "text-[#1d9e75]",
    success: "text-[#10b981]",
    warning: "text-[#f59e0b]",
    danger:  "text-[#ef4444]",
  }[accent ?? "brand"];

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 hover:border-[#1d9e75]/30 transition-colors duration-150">
      <p className="text-[11px] font-medium text-[#64748b] uppercase tracking-[0.06em] mb-2">{label}</p>
      <p className={`text-3xl font-semibold tabular-nums ${accentColor}`}>{value}</p>
      {sub && <p className="text-xs text-[#64748b] mt-1">{sub}</p>}
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
    { count: apiKeyCount },
    { data: allStatuses },
    { data: apiKeys },
  ] = await Promise.all([
    supabase.from("customers").select("plan, subscription_status").eq("id", user!.id).single(),
    supabase
      .from("verifications")
      .select("id, status, risk_score, document_type, created_at")
      .eq("customer_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("api_keys").select("id", { count: "exact", head: true }).eq("customer_id", user!.id),
    supabase.from("verifications").select("status").eq("customer_id", user!.id),
    supabase.from("api_keys").select("id, name, created_at").eq("customer_id", user!.id).order("created_at", { ascending: false }).limit(2),
  ]);

  const tally = (allStatuses ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  const total = (allStatuses ?? []).length;

  const paidPlans = ["starter", "growth", "scale"];
  const hasPaidPlan = paidPlans.includes(customer?.plan ?? "");
  const hasApiKey = (apiKeyCount ?? 0) > 0;
  const hasVerification = total > 0;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-8">
      <AnnouncementBanner />
      <OnboardingChecklist
        hasApiKey={hasApiKey}
        hasVerification={hasVerification}
        hasPaidPlan={hasPaidPlan}
      />

      {/* ── Welcome row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
          <p className="text-xs text-[#64748b] mb-1">{today}</p>
          <h1 className="text-xl font-semibold text-[#f8fafc] mb-1">
            Welcome back
          </h1>
          <p className="text-sm text-[#64748b]">
            {customer?.plan
              ? `You're on the ${customer.plan} plan${customer.subscription_status === "active" ? " · active" : ""}.`
              : "Start your free trial to run verifications."}
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href="/dashboard/verifications"
              className="inline-flex items-center gap-1.5 h-8 px-3 bg-[#1d9e75] text-[#050a09] text-[12px] font-medium rounded-lg hover:bg-[#22c55e] transition-colors"
            >
              View verifications
            </Link>
            <Link
              href="/dashboard/api-keys"
              className="inline-flex items-center h-8 px-3 border border-white/10 text-[#94a3b8] text-[12px] font-medium rounded-lg hover:border-white/20 hover:text-[#f8fafc] transition-colors"
            >
              API keys
            </Link>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            <p className="text-xs font-medium text-[#10b981]">All systems operational</p>
          </div>
          <div className="space-y-2">
            {[
              { label: "API", status: "100% uptime" },
              { label: "Verification pipeline", status: "Healthy" },
              { label: "Sanctions screening", status: "Healthy" },
            ].map(({ label, status }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="text-[#64748b]">{label}</span>
                <span className="text-[#10b981]">{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Metrics ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total"        value={total}                sub="All time"          accent="brand"   />
        <MetricCard label="Approved"     value={tally.approved ?? 0} sub="Verified identities" accent="success" />
        <MetricCard label="Under Review" value={tally.review ?? 0}   sub="Needs attention"   accent="warning" />
        <MetricCard label="Rejected"     value={tally.rejected ?? 0} sub="Failed checks"     accent="danger"  />
      </div>

      {/* ── Recent verifications ──────────────────────────────────────────── */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-[#f8fafc]">Recent Verifications</h2>
          <Link href="/dashboard/verifications" className="text-xs text-[#1d9e75] hover:underline">
            View all →
          </Link>
        </div>

        {verificationsError && (
          <div className="mx-5 my-4 p-3 bg-[#ef4444]/[0.08] border-l-[3px] border-[#ef4444] rounded-r-lg text-xs text-[#ef4444]">
            Unable to load verification data. Please refresh the page.
          </div>
        )}

        {!verifications || verifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center mb-3">
              <svg className="w-5 h-5" fill="none" stroke="#64748b" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[#94a3b8] mb-1">No verifications yet</p>
            <p className="text-xs text-[#64748b] mb-4">Submit your first API request to see results here.</p>
            <Link href="/dashboard/help"
              className="inline-flex items-center h-8 px-3 bg-[#1d9e75] text-[#050a09] text-xs font-medium rounded-lg hover:bg-[#22c55e] transition-colors">
              View API docs
            </Link>
          </div>
        ) : (
          <VerificationsTable verifications={verifications} />
        )}
      </div>

      {/* ── API Keys preview + Quick links ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* API keys preview */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <h2 className="text-sm font-semibold text-[#f8fafc]">API Keys</h2>
            <Link href="/dashboard/api-keys" className="text-xs text-[#1d9e75] hover:underline">
              Manage →
            </Link>
          </div>
          {!apiKeys || apiKeys.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-xs text-[#64748b] mb-3">No API keys yet</p>
              <Link href="/dashboard/api-keys"
                className="inline-flex items-center h-7 px-3 bg-[#1d9e75] text-[#050a09] text-[11px] font-medium rounded-md hover:bg-[#22c55e] transition-colors">
                Create key
              </Link>
            </div>
          ) : (
            <div>
              {apiKeys.map((k) => (
                <div key={k.id} className="flex items-center justify-between px-5 py-3 border-b border-white/[0.04] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[#f8fafc]">{k.name}</p>
                    <p className="text-[11px] font-mono text-[#64748b] mt-0.5">vrd_live_••••••••</p>
                  </div>
                  <p className="text-xs text-[#64748b]">
                    {new Date(k.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#f8fafc] mb-4">Quick Links</h2>
          <div className="space-y-2">
            {[
              { label: "API documentation",    href: "/dashboard/help",          sub: "Guides, endpoints, and examples" },
              { label: "Set up webhooks",       href: "/dashboard/webhooks",      sub: "Real-time verification events"   },
              { label: "Manage billing",        href: "/dashboard/billing",       sub: "Usage, plans, and invoices"      },
              { label: "View all verifications", href: "/dashboard/verifications", sub: "Full audit trail"               },
            ].map(({ label, href, sub }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.04] transition-colors group"
              >
                <div>
                  <p className="text-[13px] font-medium text-[#94a3b8] group-hover:text-[#f8fafc] transition-colors">{label}</p>
                  <p className="text-[11px] text-[#64748b]">{sub}</p>
                </div>
                <svg className="w-4 h-4 text-[#64748b] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
