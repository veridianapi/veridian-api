import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { VerificationsTable } from "./_components/VerificationsTable";
import { RangeSelector } from "./RangeSelector";
import { UpdatedAgo } from "./UpdatedAgo";

const RANGE_MS: Record<string, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d":  7  * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
};

const RANGE_LABELS: Record<string, string> = {
  "24h": "last 24 hours",
  "7d":  "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
};

const SPARKLINES = {
  total:    "0,12 10,11 20,13 30,9 40,10 50,7 60,8 70,5 80,6 90,4 100,3",
  approved: "0,10 10,11 20,9 30,10 40,8 50,9 60,7 70,8 80,6 90,5 100,4",
  review:   "0,9 10,8 20,10 30,9 40,11 50,9 60,10 70,8 80,9 90,8 100,9",
  rejected: "0,14 10,15 20,13 30,14 40,12 50,13 60,14 70,12 80,13 90,12 100,11",
};

function Sparkline({ points, color }: { points: string; color: string }) {
  return (
    <svg className="h-[18px] flex-1 ml-3" viewBox="0 0 100 18" preserveAspectRatio="none" style={{ color }}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function MetricCard({
  dot, label, value, delta, deltaColor, sparkKey, sparkColor,
}: {
  dot: string;
  label: string;
  value: number;
  delta: string;
  deltaColor?: string;
  sparkKey: keyof typeof SPARKLINES;
  sparkColor: string;
}) {
  return (
    <div className="bg-[#111916] border border-white/[0.06] rounded-[6px] px-4 pt-[14px] pb-4 hover:border-white/10 transition-colors duration-100 cursor-default">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-[6px] h-[6px] rounded-full shrink-0 ${dot}`} />
        <span className="text-[10px] font-medium text-[#5a7268] uppercase tracking-[0.08em]">{label}</span>
      </div>
      <div className="text-[28px] font-medium tracking-[-0.025em] leading-none text-[#f0f4f3] tabular-nums mb-2">
        {value}
      </div>
      <div className="flex items-center">
        <span className="text-[11px] font-mono text-[#5a7268]" style={deltaColor ? { color: deltaColor } : undefined}>
          {delta}
        </span>
        <Sparkline points={SPARKLINES[sparkKey]} color={sparkColor} />
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range = rangeParam && RANGE_MS[rangeParam] ? rangeParam : "7d";
  const now = Date.now();
  const cutoff = new Date(now - RANGE_MS[range]).toISOString();
  const prevCutoff = new Date(now - 2 * RANGE_MS[range]).toISOString();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: verifications, error: verificationsError },
    { data: allStatuses },
    { count: prevCount },
  ] = await Promise.all([
    supabase
      .from("verifications")
      .select("id, status, risk_score, document_type, created_at")
      .eq("customer_id", user.id)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("verifications")
      .select("status")
      .eq("customer_id", user.id)
      .gte("created_at", cutoff),
    supabase
      .from("verifications")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", user.id)
      .gte("created_at", prevCutoff)
      .lt("created_at", cutoff),
  ]);

  const tally = (allStatuses ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  const total = (allStatuses ?? []).length;
  const approved = tally.approved ?? 0;
  const underReview = tally.review ?? 0;
  const rejected = tally.rejected ?? 0;

  const passRate = total > 0 ? ((approved / total) * 100).toFixed(1) : "0.0";
  const blockRate = total > 0 ? ((rejected / total) * 100).toFixed(1) : "0.0";

  const prevTotal = prevCount ?? 0;
  const totalDeltaPct = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;
  const totalDeltaStr = totalDeltaPct !== null
    ? `${totalDeltaPct >= 0 ? "+" : ""}${totalDeltaPct}% · ${prevTotal} prev`
    : `${prevTotal} prev`;
  const totalDeltaColor = totalDeltaPct !== null && totalDeltaPct >= 0 ? "#1d9e75" : "#c4564a";

  const today = new Date().toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const rowCount = Math.min(verifications?.length ?? 0, 8);

  return (
    <div className="max-w-[1280px]">

      {/* Page head */}
      <div className="flex items-end justify-between mb-[22px]">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.022em] text-[#f0f4f3] mb-1">Overview</h1>
          <p className="text-[12px] text-[#5a7268]">{today} &middot; {RANGE_LABELS[range]} &middot; UTC</p>
        </div>
        <div className="flex items-center gap-1.5">
          <RangeSelector selected={range} />
          <button className="h-7 px-[11px] flex items-center gap-1.5 border border-white/[0.06] rounded-[5px] text-[12px] font-medium text-[#a3b3ae] hover:bg-white/[0.03] hover:text-[#f0f4f3] hover:border-white/10 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>
            </svg>
            Export
          </button>
          <Link href="/dashboard/help"
            className="h-7 px-[11px] flex items-center gap-1.5 bg-[#1d9e75] text-[#04140e] text-[12px] font-semibold rounded-[5px] hover:bg-[#25b485] transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14"/><path d="M5 12h14"/>
            </svg>
            New verification
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        <MetricCard dot="bg-[#5a7268]" label="Total"        value={total}       delta={totalDeltaStr}               deltaColor={totalDeltaColor} sparkKey="total"    sparkColor="#5a7268" />
        <MetricCard dot="bg-[#1d9e75]" label="Approved"     value={approved}    delta={passRate + "% pass rate"}    deltaColor="#1d9e75" sparkKey="approved"  sparkColor="#1d9e75" />
        <MetricCard dot="bg-[#d4a24a]" label="Under review" value={underReview} delta="needs attention"             sparkKey="review"   sparkColor="#d4a24a" />
        <MetricCard dot="bg-[#c4564a]" label="Rejected"     value={rejected}    delta={blockRate + "% block rate"}  deltaColor="#c4564a" sparkKey="rejected"  sparkColor="#c4564a" />
      </div>

      {/* Recent verifications panel */}
      <div className="bg-[#111916] border border-white/[0.06] rounded-[6px] overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
          <span className="text-[13px] font-semibold text-[#f0f4f3] tracking-[-0.01em]">Recent verifications</span>
          <span className="font-mono text-[11px] text-[#5a7268]">{rowCount} of {total}</span>
          <div className="ml-auto flex items-center gap-1.5">
            {["Status", "Risk", "Document"].map((f) => (
              <span key={f} className="flex items-center gap-1.5 px-2 py-[3px] border border-dashed border-white/10 rounded text-[11px] text-[#5a7268] cursor-pointer hover:text-[#a3b3ae] hover:border-white/[0.18] transition-colors">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14"/><path d="M5 12h14"/>
                </svg>
                {f}
              </span>
            ))}
          </div>
        </div>

        {verificationsError && (
          <div className="mx-4 my-3 px-3 py-2 bg-[#c4564a]/[0.08] border-l-[3px] border-[#c4564a] rounded-r text-[12px] text-[#c4564a]">
            Unable to load verification data. Please refresh.
          </div>
        )}

        {!verifications || verifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-9 h-9 rounded-full bg-white/[0.04] flex items-center justify-center mb-3">
              <svg width="18" height="18" fill="none" stroke="#5a7268" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="text-[13px] font-medium text-[#a3b3ae] mb-1">No verifications yet</p>
            <p className="text-[12px] text-[#5a7268] mb-4">Submit your first API request to see results here.</p>
            <Link href="/dashboard/help"
              className="inline-flex items-center h-7 px-3 bg-[#1d9e75] text-[#04140e] text-[12px] font-semibold rounded-[5px] hover:bg-[#25b485] transition-colors">
              View API docs
            </Link>
          </div>
        ) : (
          <VerificationsTable verifications={verifications} />
        )}

        {verifications && verifications.length > 0 && (
          <div className="flex items-center px-4 py-[10px] border-t border-white/[0.06] font-mono text-[11px] text-[#5a7268] gap-[14px]">
            <span>{"Showing 1–" + rowCount}</span>
            <span className="opacity-50">&middot;</span>
            <UpdatedAgo />
            <Link href="/dashboard/verifications"
              className="ml-auto flex items-center gap-1 text-[#a3b3ae] font-sans text-[12px] hover:text-[#f0f4f3] transition-colors">
              View all verifications
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
              </svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
