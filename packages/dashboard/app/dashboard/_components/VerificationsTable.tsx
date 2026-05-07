"use client";

import Link from "next/link";
import { motion, type Variants, type Easing } from "framer-motion";

interface Verification {
  id: string;
  status: string;
  risk_score: number | null;
  document_type: string;
  created_at: string;
  full_name: string | null;
  applicant_email: string | null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const STATUS_META: Record<string, { dot: string; label: string; text: string }> = {
  approved: { dot: "bg-[#1d9e75]", label: "PASS",   text: "text-[#1d9e75]" },
  review:   { dot: "bg-[#d4a24a]", label: "REVIEW", text: "text-[#d4a24a]" },
  rejected: { dot: "bg-[#c4564a]", label: "BLOCK",  text: "text-[#c4564a]" },
  pending:  { dot: "bg-[#5a7268]", label: "PEND",   text: "text-[#5a7268]" },
};

function riskBand(score: number): "low" | "mid" | "high" {
  if (score < 30) return "low";
  if (score < 70) return "mid";
  return "high";
}

const BAND_COLOR = {
  low:  "bg-[#1d9e75]",
  mid:  "bg-[#d4a24a]",
  high: "bg-[#c4564a]",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(0, mins)}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function docLabel(docType: string): string {
  const map: Record<string, string> = {
    passport:        "PASSPORT",
    driving_licence: "DRV_LIC",
    national_id:     "NATL_ID",
  };
  return map[docType] ?? docType.toUpperCase().slice(0, 8);
}

const EASE: Easing = "easeOut";

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.18, ease: EASE },
  }),
};

export function VerificationsTable({ verifications }: { verifications: Verification[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            <th className="w-7 px-4 py-2 border-b border-white/[0.06] bg-white/[0.012]">
              <span className="inline-block w-3 h-3 border border-white/10 rounded-[3px]" />
            </th>
            {["ID", "Name", "Status", "Risk", "Document", "Created", ""].map((col) => (
              <th key={col} className="text-left text-[11px] font-medium text-[#5a7268] px-4 py-2 border-b border-white/[0.06] bg-white/[0.012] whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {verifications.map((v, i) => {
            const s = STATUS_META[v.status] ?? STATUS_META.pending;
            const score = v.risk_score ?? 0;
            const band = riskBand(score);
            return (
              <motion.tr
                key={v.id}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={rowVariants}
                className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.025] transition-colors duration-75 cursor-pointer group"
              >
                <td className="px-4 py-[10px]">
                  <span className="inline-block w-3 h-3 border border-white/10 rounded-[3px]" />
                </td>
                <td className="px-4 py-[10px] font-mono text-[12px] text-[#5a7268] whitespace-nowrap">
                  <Link href={`/dashboard/verifications/${v.id}`} className="hover:text-[#f0f4f3] transition-colors">
                    {v.id.slice(0, 8)}...
                  </Link>
                </td>
                <td className="px-4 py-[10px]">
                  {v.full_name ? (
                    <div className="flex items-center gap-[10px]">
                      <div className="w-5 h-5 rounded-full bg-[#1d2926] flex items-center justify-center shrink-0 font-mono text-[10px] text-[#a3b3ae]">
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
                  <span className={`inline-flex items-center gap-2 ${s.text}`}>
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
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
