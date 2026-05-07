import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { RangeSelector } from "../RangeSelector";
import { UpdatedAgo } from "../UpdatedAgo";

const PAGE_SIZE = 10;

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

const FILTER_TABS = [
  { label: "All",      value: "",         dot: null              },
  { label: "Approved", value: "approved", dot: "bg-[#1d9e75]"   },
  { label: "Review",   value: "review",   dot: "bg-[#d4a24a]"   },
  { label: "Rejected", value: "rejected", dot: "bg-[#c4564a]"   },
] as const;

const STATUS_META: Record<string, { dot: string; label: string; textColor: string }> = {
  approved: { dot: "bg-[#1d9e75]", label: "PASS",   textColor: "text-[#1d9e75]" },
  review:   { dot: "bg-[#d4a24a]", label: "REVIEW", textColor: "text-[#d4a24a]" },
  rejected: { dot: "bg-[#c4564a]", label: "BLOCK",  textColor: "text-[#c4564a]" },
  pending:  { dot: "bg-[#5a7268]", label: "PEND",   textColor: "text-[#5a7268]" },
};

const BAND_COLOR = {
  low:  "bg-[#1d9e75]",
  mid:  "bg-[#d4a24a]",
  high: "bg-[#c4564a]",
};

function riskBand(score: number): "low" | "mid" | "high" {
  if (score < 30) return "low";
  if (score < 70) return "mid";
  return "high";
}

function docLabel(docType: string): string {
  const map: Record<string, string> = {
    passport:        "PASSPORT",
    driving_licence: "DRV_LIC",
    national_id:     "NATL_ID",
  };
  return map[docType] ?? docType.toUpperCase().slice(0, 8);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(0, mins)}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default async function VerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string; range?: string }>;
}) {
  const { page: pageParam, q, status: statusFilter, range: rangeParam } = await searchParams;
  const range = rangeParam && RANGE_MS[rangeParam] ? rangeParam : "7d";
  const page = Math.max(1, Number(pageParam ?? 1));
  const from = (page - 1) * PAGE_SIZE;

  const now = Date.now();
  const cutoff = new Date(now - RANGE_MS[range]).toISOString();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let query = supabase
    .from("verifications")
    .select("id, status, risk_score, document_type, created_at, full_name, applicant_email, nationality", { count: "exact" })
    .eq("customer_id", user!.id)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (statusFilter) query = query.eq("status", statusFilter);
  if (q) query = query.ilike("full_name", `%${q}%`);

  const { data: verifications, count, error: queryError } = await query;

  const { data: allStatuses } = await supabase
    .from("verifications")
    .select("status")
    .eq("customer_id", user!.id)
    .gte("created_at", cutoff);

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
    params.set("range", range);
    return `/dashboard/verifications?${params.toString()}`;
  }

  function tabHref(value: string) {
    const params = new URLSearchParams();
    if (value) params.set("status", value);
    if (q) params.set("q", q);
    params.set("range", range);
    return `/dashboard/verifications?${params.toString()}`;
  }

  function tabCount(value: string) {
    if (!value) return totalCount;
    return statusCounts[value] ?? 0;
  }

  const rowCount = verifications?.length ?? 0;
  const showingFrom = (count ?? 0) === 0 ? 0 : from + 1;
  const showingTo = from + rowCount;

  const rangeExtraParams = statusFilter ? { status: statusFilter } : undefined;

  return (
    <div className="max-w-[1280px]">

      {/* Page head */}
      <div className="flex items-end justify-between mb-[22px]">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.022em] text-[#f0f4f3] mb-1">Verifications</h1>
          <p className="text-[12px] text-[#5a7268]">All identity checks &middot; {RANGE_LABELS[range]} &middot; UTC</p>
        </div>
        <div className="flex items-center gap-1.5">
          <RangeSelector selected={range} basePath="/dashboard/verifications" extraParams={rangeExtraParams} />
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

      {/* Filter tabs */}
      <div className="flex items-center gap-0.5 border-b border-white/[0.06] mb-4">
        {FILTER_TABS.map(({ label, value, dot }) => {
          const isActive = (statusFilter ?? "") === value;
          return (
            <Link
              key={value || "all"}
              href={tabHref(value)}
              className={`inline-flex items-center gap-[7px] px-3 py-2 -mb-px border-b text-[12.5px] font-medium tracking-[-0.005em] transition-colors ${
                isActive
                  ? "text-[#f0f4f3] border-[#1d9e75]"
                  : "text-[#5a7268] border-transparent hover:text-[#a3b3ae]"
              }`}
            >
              {dot && <span className={`w-[6px] h-[6px] rounded-full shrink-0 ${dot}`} />}
              {label}
              <span className={`font-mono text-[11px] px-[6px] py-[1px] border rounded-[4px] bg-white/[0.015] ${
                isActive ? "text-[#a3b3ae] border-white/10" : "text-[#5a7268] border-white/[0.06]"
              }`}>
                {tabCount(value)}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-[14px]">
        <form method="GET" className="flex-1 max-w-[360px]">
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          <input type="hidden" name="range" value={range} />
          <label className="flex items-center gap-2 h-[30px] px-[10px] border border-white/[0.06] rounded-[5px] bg-[#111916] text-[#5a7268] cursor-text hover:border-white/10 focus-within:border-[#1d9e75] transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
            </svg>
            <input
              type="text" name="q" placeholder="Search by name, ID, or document…"
              defaultValue={q ?? ""}
              className="bg-transparent border-none outline-none text-[#f0f4f3] text-[12.5px] flex-1 min-w-0 placeholder:text-[#5a7268]"
            />
            <span className="ml-auto font-mono text-[10px] text-[#5a7268] border border-white/[0.06] rounded px-[6px] py-[2px]">/</span>
          </label>
        </form>

        <button className="h-[30px] inline-flex items-center gap-[6px] px-[10px] border border-white/[0.06] rounded-[5px] text-[12px] font-medium hover:border-white/10 hover:bg-white/[0.02] transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#5a7268]">
            <path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/>
          </svg>
          <span className="text-[#5a7268]">Status</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#5a7268]">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>

        <button className="h-[30px] inline-flex items-center gap-[6px] px-[10px] border border-white/[0.06] rounded-[5px] text-[12px] font-medium hover:border-white/10 hover:bg-white/[0.02] transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#5a7268]">
            <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
          </svg>
          <span className="text-[#5a7268]">Risk</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#5a7268]">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>

        <button className="h-[30px] inline-flex items-center gap-[6px] px-[10px] border border-white/[0.06] rounded-[5px] text-[12px] font-medium hover:border-white/10 hover:bg-white/[0.02] transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#5a7268]">
            <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>
          </svg>
          <span className="text-[#5a7268]">Document</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#5a7268]">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>

        <button className="h-[30px] inline-flex items-center gap-[6px] px-[10px] border border-white/[0.06] rounded-[5px] text-[12px] font-medium hover:border-white/10 hover:bg-white/[0.02] transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#5a7268]">
            <circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/>
          </svg>
          <span className="text-[#5a7268]">Country</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#5a7268]">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>

        <div className="flex-1" />

        <button className="h-[30px] px-[11px] flex items-center gap-1.5 border border-white/[0.06] rounded-[5px] text-[12px] font-medium text-[#a3b3ae] hover:bg-white/[0.03] hover:text-[#f0f4f3] hover:border-white/10 transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          Views
        </button>
      </div>

      {/* Table panel */}
      <div className="bg-[#111916] border border-white/[0.06] rounded-[6px] overflow-hidden">
        {queryError ? (
          <div className="mx-4 my-3 px-3 py-2 bg-[#c4564a]/[0.08] border-l-[3px] border-[#c4564a] rounded-r text-[12px] text-[#c4564a]">
            Unable to load verification data. Please refresh.
          </div>
        ) : !verifications || verifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-9 h-9 rounded-full bg-white/[0.04] flex items-center justify-center mb-3">
              <svg width="18" height="18" fill="none" stroke="#5a7268" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="text-[13px] font-medium text-[#a3b3ae] mb-1">
              {statusFilter ? `No ${statusFilter} verifications` : "No verifications yet"}
            </p>
            <p className="text-[12px] text-[#5a7268] mb-4">
              {statusFilter
                ? "Try a different filter or clear the selection."
                : "Submit your first API request to see results here."}
            </p>
            {statusFilter ? (
              <Link href={`/dashboard/verifications?range=${range}`}
                className="inline-flex items-center h-7 px-3 border border-white/10 text-[#a3b3ae] text-[12px] font-medium rounded-[5px] hover:border-white/20 hover:text-[#f0f4f3] transition-colors">
                Clear filter
              </Link>
            ) : (
              <Link href="/dashboard/help"
                className="inline-flex items-center h-7 px-3 bg-[#1d9e75] text-[#04140e] text-[12px] font-semibold rounded-[5px] hover:bg-[#25b485] transition-colors">
                View API docs
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr>
                  <th className="w-7 px-4 py-2 border-b border-white/[0.06] bg-white/[0.012]">
                    <span className="inline-block w-3 h-3 border border-white/10 rounded-[3px]" />
                  </th>
                  {["ID", "Name", "Status", "Risk", "Document", "Country", "Created", ""].map((col) => (
                    <th key={col} className="text-left text-[11px] font-medium text-[#5a7268] px-4 py-2 border-b border-white/[0.06] bg-white/[0.012] whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {verifications.map((v) => {
                  const s = STATUS_META[v.status] ?? STATUS_META.pending;
                  const score = v.risk_score ?? 0;
                  const band = riskBand(score);
                  return (
                    <tr
                      key={v.id}
                      className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.025] transition-colors duration-75 cursor-pointer group"
                    >
                      <td className="px-4 py-[10px]">
                        <span className="inline-block w-3 h-3 border border-white/10 rounded-[3px]" />
                      </td>
                      <td className="px-4 py-[10px] font-mono text-[12px] text-[#5a7268] whitespace-nowrap">
                        <Link href={`/dashboard/verifications/${v.id}`} className="hover:text-[#f0f4f3] transition-colors">
                          {v.id.slice(0, 14)}…
                        </Link>
                      </td>
                      <td className="px-4 py-[10px]">
                        {v.full_name ? (
                          <div className="flex items-center gap-[10px]">
                            <div className="w-5 h-5 rounded-full bg-[#1d2926] flex items-center justify-center shrink-0 font-mono text-[10px] font-medium text-[#a3b3ae]">
                              {initials(v.full_name)}
                            </div>
                            <div className="leading-[1.25]">
                              <div className="text-[12.5px] font-medium text-[#f0f4f3]">{v.full_name}</div>
                              {v.applicant_email && (
                                <div className="text-[11px] text-[#5a7268]">{v.applicant_email}</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#5a7268] text-[12px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-[10px]">
                        <span className={`inline-flex items-center gap-2 ${s.textColor}`}>
                          <span className={`w-[6px] h-[6px] rounded-full shrink-0 ${s.dot}`} />
                          <span className="font-mono text-[11px] tracking-[0.02em] uppercase">{s.label}</span>
                        </span>
                      </td>
                      <td className="px-4 py-[10px] font-mono text-[12px] text-[#f0f4f3]">
                        <div className="flex items-center gap-2">
                          <span className="relative inline-block w-9 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                            <i className={`block h-full rounded-full ${BAND_COLOR[band]}`} style={{ width: `${score}%` }} />
                          </span>
                          {String(score).padStart(2, "0")}
                        </div>
                      </td>
                      <td className="px-4 py-[10px]">
                        <span className="inline-flex items-center px-[7px] py-[2px] border border-white/[0.06] rounded bg-white/[0.015] font-mono text-[11px] text-[#a3b3ae] tracking-[0.01em]">
                          {docLabel(v.document_type)}
                        </span>
                      </td>
                      <td className="px-4 py-[10px] font-mono text-[12px] text-[#a3b3ae]">
                        {v.nationality ?? <span className="text-[#5a7268]">—</span>}
                      </td>
                      <td className="px-4 py-[10px] text-[12px] text-[#5a7268] whitespace-nowrap">
                        {new Date(v.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {", "}
                        {new Date(v.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        <span className="text-[11px] ml-1.5">{timeAgo(v.created_at)} ago</span>
                      </td>
                      <td className="w-7 px-3 py-[10px] text-right">
                        <button className="w-[22px] h-[22px] inline-flex items-center justify-center rounded text-[#5a7268] opacity-0 group-hover:opacity-100 hover:bg-white/[0.05] hover:text-[#f0f4f3] transition-all">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="6" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="18" r="1"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {verifications && verifications.length > 0 && (
          <div className="flex items-center px-4 py-[10px] border-t border-white/[0.06] gap-[14px]">
            <span className="font-mono text-[11px] text-[#5a7268]">
              Showing{" "}
              <span className="text-[#f0f4f3] font-medium">{showingFrom}–{showingTo}</span>
              {" "}of{" "}
              <span className="text-[#f0f4f3] font-medium">{count ?? 0}</span>
            </span>
            <span className="text-[#5a7268] opacity-50">&middot;</span>
            <span className="font-mono text-[11px] text-[#5a7268]"><UpdatedAgo /></span>

            {totalPages > 1 && (
              <div className="ml-auto inline-flex items-center gap-1">
                <Link
                  href={pageHref(page - 1)}
                  aria-disabled={page <= 1}
                  className={`h-6 min-w-[24px] px-2 inline-flex items-center justify-center gap-1 border border-white/[0.06] rounded-[4px] text-[#a3b3ae] text-[12px] font-medium hover:border-white/10 hover:text-[#f0f4f3] hover:bg-white/[0.02] transition-colors${page <= 1 ? " opacity-50 pointer-events-none" : ""}`}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                  Prev
                </Link>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(Math.max(0, page - 3), Math.min(totalPages, page + 2))
                  .map((p) => (
                    <Link
                      key={p}
                      href={pageHref(p)}
                      className={`h-6 min-w-[24px] px-2 inline-flex items-center justify-center border rounded-[4px] text-[12px] font-medium transition-colors${
                        p === page
                          ? " text-[#f0f4f3] border-white/10 bg-white/[0.04]"
                          : " text-[#a3b3ae] border-white/[0.06] hover:border-white/10 hover:text-[#f0f4f3] hover:bg-white/[0.02]"
                      }`}
                    >
                      {p}
                    </Link>
                  ))}
                <Link
                  href={pageHref(page + 1)}
                  aria-disabled={page >= totalPages}
                  className={`h-6 min-w-[24px] px-2 inline-flex items-center justify-center gap-1 border border-white/[0.06] rounded-[4px] text-[#a3b3ae] text-[12px] font-medium hover:border-white/10 hover:text-[#f0f4f3] hover:bg-white/[0.02] transition-colors${page >= totalPages ? " opacity-50 pointer-events-none" : ""}`}
                >
                  Next
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
