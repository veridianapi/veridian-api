import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { StatusBadge } from "../_components/StatusBadge";
import { EmptyState } from "../_components/EmptyState";

const PAGE_SIZE = 20;

function RiskBar({ score }: { score: number | null }) {
  if (score === null) {
    return <span style={{ fontSize: 14, color: "#5a7268" }}>—</span>;
  }
  // DESIGN.md §7: 0-29 = success, 30-69 = warning, 70-100 = danger
  const color =
    score >= 70 ? "#dc2626" : score >= 30 ? "#d97706" : "#16a34a";

  return (
    <div className="flex items-center gap-2">
      <span
        style={{ fontSize: 13, fontWeight: 600, color, fontVariantNumeric: "tabular-nums", fontFamily: "var(--font-mono)" }}
      >
        {score}
      </span>
      <div
        className="w-16 rounded-full overflow-hidden"
        style={{ height: 4, backgroundColor: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="h-full rounded-full"
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
          <h1 className="font-semibold" style={{ fontSize: 22, color: "#f0f4f3", letterSpacing: "-0.02em", marginBottom: 4 }}>
            Verifications
          </h1>
          <p style={{ fontSize: 13, color: "#5a7268", fontWeight: 400 }}>
            {count ?? 0} total record{(count ?? 0) !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Search bar — follows input spec */}
        <div className="relative w-full sm:w-auto">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="#5a7268" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <form method="GET">
            <input
              type="text"
              name="q"
              placeholder="Search verifications…"
              defaultValue={q ?? ""}
              className="pl-9 pr-4 text-sm rounded-lg focus:outline-none focus:ring-2 w-full sm:w-64"
              style={{
                backgroundColor: "#0d1211",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#f0f4f3",
                height: 36,
                fontFeatureSettings: '"cv01","ss03"',
                "--tw-ring-color": "#1d9e75",
              } as React.CSSProperties}
            />
          </form>
        </div>
      </div>

      {/* Table card */}
      <div
        className="card-lift rounded-xl overflow-hidden"
        style={{ backgroundColor: "#111916", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {queryError ? (
          <EmptyState
            icon={
              <svg className="w-4 h-4" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
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
              <svg className="w-4 h-4" fill="none" stroke="#5a7268" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
            title="No verifications yet"
            description="Submit your first API request to see results here."
            action={
              <Link
                href="/dashboard/help"
                style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "0 16px", height: 36, borderRadius: 8, fontSize: 13, fontWeight: 500, backgroundColor: "#1d9e75", color: "#050a09" }}
              >
                View API docs
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table
                className="w-full min-w-[600px]"
                style={{ borderCollapse: "collapse", fontSize: 14 }}
              >
                <thead>
                  <tr>
                    {["ID", "Status", "Risk Score", "Document Type", "Created"].map((col) => (
                      <th
                        key={col}
                        className="text-left"
                        style={{
                          padding: "12px 16px",
                          fontSize: 11,
                          fontWeight: 500,
                          color: "#5a7268",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
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
                      className="hover:bg-[rgba(255,255,255,0.02)] transition-colors duration-[120ms]"
                      style={{
                        borderBottom:
                          idx < verifications.length - 1
                            ? "1px solid rgba(255,255,255,0.04)"
                            : "none",
                      }}
                    >
                      <td style={{ padding: "16px 16px" }}>
                        <Link
                          href={`/dashboard/verifications/${v.id}`}
                          className="hover:underline"
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 12,
                            fontWeight: 500,
                            color: "#5a7268",
                          }}
                        >
                          {v.id.slice(0, 8)}…
                        </Link>
                      </td>
                      <td style={{ padding: "16px 16px" }}>
                        <StatusBadge status={v.status} />
                      </td>
                      <td style={{ padding: "16px 16px" }}>
                        <RiskBar score={v.risk_score} />
                      </td>
                      <td
                        style={{
                          padding: "16px 16px",
                          color: "#a3b3ae",
                          textTransform: "capitalize",
                          fontSize: 13,
                        }}
                      >
                        {v.document_type.replace(/_/g, " ")}
                      </td>
                      <td style={{ padding: "16px 16px", color: "#a3b3ae", fontSize: 13 }}>
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
                style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Link
                  href={page > 1 ? `/dashboard/verifications?page=${page - 1}` : "#"}
                  aria-disabled={page <= 1}
                  className={`inline-flex items-center gap-2 text-[13px] font-medium rounded-lg ${
                    page <= 1 ? "cursor-not-allowed pointer-events-none opacity-30" : "hover:opacity-80"
                  }`}
                  style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#a3b3ae",
                    padding: "0 16px",
                    height: 36,
                    borderRadius: 8,
                  }}
                >
                  ← Previous
                </Link>

                <span style={{ fontSize: 14, color: "#a3b3ae" }}>
                  Page{" "}
                  <span style={{ fontWeight: 500, color: "#f0f4f3" }}>{page}</span>
                  {" "}of{" "}
                  <span style={{ fontWeight: 500, color: "#f0f4f3" }}>{totalPages}</span>
                </span>

                <Link
                  href={page < totalPages ? `/dashboard/verifications?page=${page + 1}` : "#"}
                  aria-disabled={page >= totalPages}
                  className={`inline-flex items-center gap-2 text-[13px] font-medium rounded-lg ${
                    page >= totalPages ? "cursor-not-allowed pointer-events-none opacity-30" : "hover:opacity-80"
                  }`}
                  style={{
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#a3b3ae",
                    padding: "0 16px",
                    height: 36,
                    borderRadius: 8,
                  }}
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
