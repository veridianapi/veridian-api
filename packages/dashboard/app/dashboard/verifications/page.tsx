import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

const PAGE_SIZE = 20;

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

function RiskBar({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-sm" style={{ color: "#5a7068" }}>—</span>;
  }

  const color =
    score >= 70 ? "#f87171" : score >= 30 ? "#fbbf24" : "#4ade80";

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold tabular-nums" style={{ color }}>{score}</span>
      <div
        className="w-16 h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: "#1a2b25" }}
      >
        <div
          className="h-full rounded-full transition-all duration-150"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default async function VerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page: pageParam, q } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1));
  const from = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: verifications, count, error: queryError } = await supabase
    .from("verifications")
    .select("id, status, risk_score, document_type, created_at", { count: "exact" })
    .eq("customer_id", user!.id)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Verifications</h1>
          <p className="text-sm mt-0.5" style={{ color: "#a3b3ae" }}>
            {count ?? 0} total record{(count ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-auto">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="#a3b3ae" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <form method="GET">
            <input
              type="text"
              name="q"
              placeholder="Search verifications…"
              defaultValue={q ?? ""}
              className="pl-9 pr-4 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 w-full sm:w-64 min-h-[44px]"
              style={{
                backgroundColor: "#111916",
                border: "1px solid #1a2b25",
                color: "#ffffff",
                "--tw-ring-color": "#1d9e75",
              } as React.CSSProperties}
            />
          </form>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-xl" style={{ backgroundColor: "#111916", border: "1px solid #1a2b25" }}>
        {queryError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
              style={{ backgroundColor: "rgba(248,113,113,0.10)" }}
            >
              <svg className="w-6 h-6" fill="none" stroke="#f87171" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-white">Unable to load verifications</p>
            <p className="text-xs mt-1" style={{ color: "#a3b3ae" }}>
              Please refresh the page. If the problem persists, contact support.
            </p>
          </div>
        ) : !verifications || verifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
              style={{ backgroundColor: "rgba(163,179,174,0.08)" }}
            >
              <svg className="w-6 h-6" fill="none" stroke="#a3b3ae" strokeOpacity="0.4" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: "#a3b3ae" }}>No verifications found</p>
            <p className="text-xs mt-1" style={{ color: "#5a7068" }}>Submitted verifications will appear here</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="text-left" style={{ borderBottom: "1px solid #1a2b25" }}>
                    <th className="px-6 py-3.5 text-xs font-medium uppercase tracking-wide" style={{ color: "#5a7068" }}>ID</th>
                    <th className="px-6 py-3.5 text-xs font-medium uppercase tracking-wide" style={{ color: "#5a7068" }}>Status</th>
                    <th className="px-6 py-3.5 text-xs font-medium uppercase tracking-wide" style={{ color: "#5a7068" }}>Risk Score</th>
                    <th className="px-6 py-3.5 text-xs font-medium uppercase tracking-wide" style={{ color: "#5a7068" }}>Document Type</th>
                    <th className="px-6 py-3.5 text-xs font-medium uppercase tracking-wide" style={{ color: "#5a7068" }}>Created</th>
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
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/verifications/${v.id}`}
                          className="font-mono text-xs font-medium hover:underline transition-all duration-150"
                          style={{ color: "#1d9e75" }}
                        >
                          {v.id.slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="px-6 py-4">
                        <RiskBar score={v.risk_score} />
                      </td>
                      <td className="px-6 py-4 capitalize" style={{ color: "#a3b3ae" }}>
                        {v.document_type.replace(/_/g, " ")}
                      </td>
                      <td className="px-6 py-4" style={{ color: "#a3b3ae" }}>
                        {new Date(v.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderTop: "1px solid #1a2b25" }}
              >
                <Link
                  href={page > 1 ? `/dashboard/verifications?page=${page - 1}` : "#"}
                  aria-disabled={page <= 1}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-all duration-150 min-h-[44px] ${
                    page <= 1 ? "cursor-not-allowed pointer-events-none opacity-30" : "hover:opacity-80"
                  }`}
                  style={{ border: "1px solid #1a2b25", color: "#a3b3ae" }}
                >
                  ← Previous
                </Link>

                <span className="text-sm" style={{ color: "#a3b3ae" }}>
                  Page <span className="font-medium text-white">{page}</span> of{" "}
                  <span className="font-medium text-white">{totalPages}</span>
                </span>

                <Link
                  href={page < totalPages ? `/dashboard/verifications?page=${page + 1}` : "#"}
                  aria-disabled={page >= totalPages}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-all duration-150 min-h-[44px] ${
                    page >= totalPages ? "cursor-not-allowed pointer-events-none opacity-30" : "hover:opacity-80"
                  }`}
                  style={{ border: "1px solid #1a2b25", color: "#a3b3ae" }}
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
