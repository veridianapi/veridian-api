import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

const PAGE_SIZE = 20;

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

function RiskBar({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-gray-300 text-sm">—</span>;
  }

  const color =
    score >= 70
      ? "#dc2626"
      : score >= 30
      ? "#d97706"
      : "#16a34a";

  const textColor =
    score >= 70
      ? "text-red-600"
      : score >= 30
      ? "text-amber-600"
      : "text-green-600";

  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm font-semibold tabular-nums ${textColor}`}>{score}</span>
      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
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

  let query = supabase
    .from("verifications")
    .select("id, status, risk_score, document_type, created_at", { count: "exact" })
    .eq("customer_id", user!.id)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const { data: verifications, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Verifications</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {count ?? 0} total record{(count ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Search bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <form method="GET">
            <input
              type="text"
              name="q"
              placeholder="Search verifications…"
              defaultValue={q ?? ""}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent w-64 transition-all duration-150"
              style={{ "--tw-ring-color": "#0f6e56" } as React.CSSProperties}
            />
          </form>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {!verifications || verifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-400">No verifications found</p>
            <p className="text-xs text-gray-300 mt-1">Submitted verifications will appear here</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-50">
                  <th className="px-6 py-3.5 text-xs font-medium uppercase tracking-wide text-gray-400">ID</th>
                  <th className="px-6 py-3.5 text-xs font-medium uppercase tracking-wide text-gray-400">Status</th>
                  <th className="px-6 py-3.5 text-xs font-medium uppercase tracking-wide text-gray-400">Risk Score</th>
                  <th className="px-6 py-3.5 text-xs font-medium uppercase tracking-wide text-gray-400">Document Type</th>
                  <th className="px-6 py-3.5 text-xs font-medium uppercase tracking-wide text-gray-400">Created</th>
                </tr>
              </thead>
              <tbody>
                {verifications.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-all duration-150"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/verifications/${v.id}`}
                        className="font-mono text-xs font-medium hover:underline transition-all duration-150"
                        style={{ color: "#0f6e56" }}
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
                    <td className="px-6 py-4 text-gray-600 capitalize">
                      {v.document_type.replace(/_/g, " ")}
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {new Date(v.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
                <Link
                  href={page > 1 ? `/dashboard/verifications?page=${page - 1}` : "#"}
                  aria-disabled={page <= 1}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border rounded-lg transition-all duration-150 ${
                    page <= 1
                      ? "border-gray-100 text-gray-300 cursor-not-allowed pointer-events-none"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  ← Previous
                </Link>

                <span className="text-sm text-gray-400">
                  Page <span className="font-medium text-gray-700">{page}</span> of{" "}
                  <span className="font-medium text-gray-700">{totalPages}</span>
                </span>

                <Link
                  href={page < totalPages ? `/dashboard/verifications?page=${page + 1}` : "#"}
                  aria-disabled={page >= totalPages}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium border rounded-lg transition-all duration-150 ${
                    page >= totalPages
                      ? "border-gray-100 text-gray-300 cursor-not-allowed pointer-events-none"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300"
                  }`}
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
