import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { StatusBadge } from "../_components/StatusBadge";
import { EmptyState } from "../_components/EmptyState";

const PAGE_SIZE = 20;

const FILTER_TABS = [
  { label: "All",      value: ""         },
  { label: "Approved", value: "approved" },
  { label: "Review",   value: "review"   },
  { label: "Rejected", value: "rejected" },
] as const;

function RiskBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-[#64748b]">—</span>;
  const color = score >= 70 ? "text-[#ef4444]" : score >= 30 ? "text-[#f59e0b]" : "text-[#10b981]";
  const fill  = score >= 70 ? "bg-[#ef4444]"  : score >= 30 ? "bg-[#f59e0b]"  : "bg-[#1d9e75]";
  return (
    <div className="flex items-center gap-2">
      <span className={`font-mono text-sm font-medium tabular-nums ${color}`}>{score}</span>
      <div className="w-16 h-1 rounded-full bg-white/[0.08]">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default async function VerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const { page: pageParam, q, status: statusFilter } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1));
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase
    .from("verifications")
    .select("id, status, risk_score, document_type, created_at", { count: "exact" })
    .eq("customer_id", user!.id)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (statusFilter) query = query.eq("status", statusFilter);

  const { data: verifications, count, error: queryError } = await query;

  const { data: allStatuses } = await supabase
    .from("verifications").select("status").eq("customer_id", user!.id);

  const statusCounts = (allStatuses ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  const totalCount = (allStatuses ?? []).length;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (p > 1) params.set("page", String(p));
    if (statusFilter) params.set("status", statusFilter);
    if (q) params.set("q", q);
    const qs = params.toString();
    return `/dashboard/verifications${qs ? `?${qs}` : ""}`;
  }

  function tabHref(value: string) {
    const params = new URLSearchParams();
    if (value) params.set("status", value);
    if (q) params.set("q", q);
    const qs = params.toString();
    return `/dashboard/verifications${qs ? `?${qs}` : ""}`;
  }

  function tabCount(value: string) {
    if (!value) return totalCount;
    return statusCounts[value] ?? 0;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#f8fafc]">Verifications</h1>
          <p className="text-sm text-[#64748b] mt-0.5">
            {count ?? 0} record{(count ?? 0) !== 1 ? "s" : ""}
            {statusFilter ? ` · filtered by ${statusFilter}` : ""}
          </p>
        </div>
        <div className="relative w-full sm:w-auto shrink-0">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-[#64748b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <form method="GET">
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            <input
              type="text" name="q" placeholder="Search verifications…" defaultValue={q ?? ""}
              className="bg-[#0d1211] border border-white/[0.08] rounded-lg h-9 pl-9 pr-3 text-sm text-[#f8fafc] placeholder:text-[#64748b] focus:border-[#1d9e75] focus:outline-none focus:ring-2 focus:ring-[#1d9e75]/15 transition-colors w-full sm:w-64"
            />
          </form>
        </div>
      </div>

      {/* Filter tabs */}
      <nav className="flex gap-0.5 mb-5 border-b border-white/[0.06]" aria-label="Filter by status">
        {FILTER_TABS.map(({ label, value }) => {
          const isActive = (statusFilter ?? "") === value;
          return (
            <Link
              key={value || "all"}
              href={tabHref(value)}
              className={`px-4 py-2 text-[13px] font-medium transition-colors relative ${
                isActive
                  ? "text-[#f8fafc] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#1d9e75]"
                  : "text-[#64748b] hover:text-[#94a3b8]"
              }`}
            >
              {label}
              <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded ${isActive ? "bg-white/[0.10] text-[#94a3b8]" : "bg-white/[0.04] text-[#64748b]"}`}>
                {tabCount(value)}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Table card */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
        {queryError ? (
          <EmptyState
            icon={<svg className="w-5 h-5" fill="none" stroke="#ef4444" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            iconBg="rgba(239,68,68,0.10)"
            title="Unable to load verifications"
            description="Please refresh the page. If the problem persists, contact support."
          />
        ) : !verifications || verifications.length === 0 ? (
          <EmptyState
            icon={<svg className="w-5 h-5" fill="none" stroke="#64748b" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
            title={statusFilter ? `No ${statusFilter} verifications` : "No verifications yet"}
            description={statusFilter ? "Try a different filter or clear the selection." : "Submit your first API request to see results here."}
            action={
              statusFilter ? (
                <Link href="/dashboard/verifications" className="inline-flex items-center h-8 px-3 border border-white/10 text-[#94a3b8] text-xs font-medium rounded-lg hover:border-white/20 hover:text-[#f8fafc] transition-colors">Clear filter</Link>
              ) : (
                <Link href="/dashboard/help" className="inline-flex items-center h-8 px-3 bg-[#1d9e75] text-[#050a09] text-xs font-medium rounded-lg hover:bg-[#22c55e] transition-colors">View API docs</Link>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {["ID", "Status", "Risk Score", "Document Type", "Created"].map((col) => (
                      <th key={col} className="text-[11px] font-medium text-[#64748b] uppercase tracking-[0.06em] px-4 py-3 border-b border-white/[0.08] text-left whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {verifications.map((v) => (
                    <tr key={v.id} className="hover:bg-white/[0.02] transition-colors duration-150">
                      <td className="px-4 py-3.5 border-b border-white/[0.04]">
                        <Link href={`/dashboard/verifications/${v.id}`} className="font-mono text-xs text-[#1d9e75] hover:underline">
                          {v.id.slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 border-b border-white/[0.04]">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="px-4 py-3.5 border-b border-white/[0.04]">
                        <RiskBar score={v.risk_score} />
                      </td>
                      <td className="px-4 py-3.5 border-b border-white/[0.04] text-sm text-[#94a3b8] capitalize">
                        {v.document_type.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3.5 border-b border-white/[0.04] text-xs text-[#64748b] whitespace-nowrap">
                        {new Date(v.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06]">
                <Link
                  href={pageHref(page - 1)}
                  aria-disabled={page <= 1}
                  className={`inline-flex items-center h-8 px-3 border border-white/10 text-[#94a3b8] text-[13px] font-medium rounded-lg hover:border-white/20 hover:text-[#f8fafc] transition-colors${page <= 1 ? " opacity-30 pointer-events-none" : ""}`}
                >
                  ← Previous
                </Link>
                <span className="text-xs text-[#64748b]">
                  Page <span className="text-[#f8fafc] font-medium">{page}</span> of <span className="text-[#f8fafc] font-medium">{totalPages}</span>
                </span>
                <Link
                  href={pageHref(page + 1)}
                  aria-disabled={page >= totalPages}
                  className={`inline-flex items-center h-8 px-3 border border-white/10 text-[#94a3b8] text-[13px] font-medium rounded-lg hover:border-white/20 hover:text-[#f8fafc] transition-colors${page >= totalPages ? " opacity-30 pointer-events-none" : ""}`}
                >
                  Next →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
