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
  if (score === null) {
    return <span className="vd-risk vd-risk-null" style={{ fontSize: 14 }}>—</span>;
  }
  const level = score >= 70 ? "high" : score >= 30 ? "medium" : "low";
  return (
    <div className="flex items-center gap-2">
      <span className={`vd-risk vd-risk-${level}`}>{score}</span>
      <div className="vd-progress-track" style={{ width: 64 }}>
        <div
          className="vd-progress-fill"
          style={{
            width: `${score}%`,
            backgroundColor: level === "high" ? "#dc2626" : level === "medium" ? "#d97706" : "#16a34a",
          }}
        />
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Main query — filtered by status when a tab is selected
  let query = supabase
    .from("verifications")
    .select("id, status, risk_score, document_type, created_at", { count: "exact" })
    .eq("customer_id", user!.id)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data: verifications, count, error: queryError } = await query;

  // Status counts for tab badges
  const { data: allStatuses } = await supabase
    .from("verifications")
    .select("status")
    .eq("customer_id", user!.id);

  const statusCounts = (allStatuses ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  const totalCount = (allStatuses ?? []).length;

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Build pagination href — preserve status/q filters
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
      {/* Page header */}
      <div className="vd-page-head">
        <div>
          <h1 className="vd-page-head-title">Verifications</h1>
          <p className="vd-page-head-sub">
            {count ?? 0} record{(count ?? 0) !== 1 ? "s" : ""}
            {statusFilter ? ` · filtered by ${statusFilter}` : ""}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-auto">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="#5a7268" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <form method="GET">
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            <input
              type="text"
              name="q"
              placeholder="Search verifications…"
              defaultValue={q ?? ""}
              className="vd-input vd-input-search w-full sm:w-64"
            />
          </form>
        </div>
      </div>

      {/* Filter tabs */}
      <nav className="vd-tabs" aria-label="Filter by status">
        {FILTER_TABS.map(({ label, value }) => {
          const isActive = (statusFilter ?? "") === value;
          return (
            <Link
              key={value || "all"}
              href={tabHref(value)}
              className={`vd-tab${isActive ? " vd-tab-active" : ""}`}
            >
              {label}
              <span className="vd-tab-count">{tabCount(value)}</span>
            </Link>
          );
        })}
      </nav>

      {/* Table card */}
      <div className="vd-card-bare">
        {queryError ? (
          <EmptyState
            icon={
              <svg className="w-5 h-5" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
            iconBg="rgba(220,38,38,0.10)"
            title="Unable to load verifications"
            description="Please refresh the page. If the problem persists, contact support."
          />
        ) : !verifications || verifications.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-5 h-5" fill="none" stroke="#5a7268" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
            title={statusFilter ? `No ${statusFilter} verifications` : "No verifications yet"}
            description={
              statusFilter
                ? "Try a different filter or clear the selection."
                : "Submit your first API request to see results here."
            }
            action={
              statusFilter ? (
                <Link href="/dashboard/verifications" className="vd-btn vd-btn-secondary">
                  Clear filter
                </Link>
              ) : (
                <Link href="/dashboard/help" className="vd-btn vd-btn-primary">
                  View API docs
                </Link>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="vd-table" style={{ minWidth: 600 }}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Status</th>
                    <th>Risk Score</th>
                    <th>Document Type</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {verifications.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <Link
                          href={`/dashboard/verifications/${v.id}`}
                          className="vd-table-id hover:underline"
                        >
                          {v.id.slice(0, 8)}…
                        </Link>
                      </td>
                      <td><StatusBadge status={v.status} /></td>
                      <td><RiskBar score={v.risk_score} /></td>
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

            {totalPages > 1 && (
              <div className="vd-pagination">
                <Link
                  href={pageHref(page - 1)}
                  aria-disabled={page <= 1}
                  className={`vd-btn vd-btn-secondary${page <= 1 ? " opacity-30 pointer-events-none" : ""}`}
                >
                  ← Previous
                </Link>

                <span className="vd-pagination-info">
                  Page{" "}
                  <span style={{ fontWeight: 500, color: "#f0f4f3" }}>{page}</span>
                  {" "}of{" "}
                  <span style={{ fontWeight: 500, color: "#f0f4f3" }}>{totalPages}</span>
                </span>

                <Link
                  href={pageHref(page + 1)}
                  aria-disabled={page >= totalPages}
                  className={`vd-btn vd-btn-secondary${page >= totalPages ? " opacity-30 pointer-events-none" : ""}`}
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
