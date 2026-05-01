"use client";

import Link from "next/link";
import { motion, type Variants, type Easing } from "framer-motion";
import { StatusBadge } from "./StatusBadge";

interface Verification {
  id: string;
  status: string;
  risk_score: number | null;
  document_type: string;
  created_at: string;
}

function RiskScore({ score }: { score: number | null }) {
  if (score === null) return <span className="text-[#64748b]">—</span>;
  const color =
    score >= 70 ? "text-[#ef4444]"
    : score >= 30 ? "text-[#f59e0b]"
    : "text-[#10b981]";
  return <span className={`font-mono text-sm font-medium tabular-nums ${color}`}>{score}</span>;
}

const EASE: Easing = "easeOut";

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.2, ease: EASE },
  }),
};

export function VerificationsTable({ verifications }: { verifications: Verification[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {["ID", "Status", "Risk", "Document", "Created"].map((col) => (
              <th key={col} className="text-[11px] font-medium text-[#64748b] uppercase tracking-[0.06em] px-4 py-3 border-b border-white/[0.08] text-left whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {verifications.map((v, i) => (
            <motion.tr
              key={v.id}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={rowVariants}
              className="hover:bg-white/[0.02] transition-colors duration-150 group"
            >
              <td className="px-4 py-3.5 border-b border-white/[0.04]">
                <Link
                  href={`/dashboard/verifications/${v.id}`}
                  className="font-mono text-xs text-[#1d9e75] hover:underline"
                >
                  {v.id.slice(0, 8)}…
                </Link>
              </td>
              <td className="px-4 py-3.5 border-b border-white/[0.04]">
                <StatusBadge status={v.status} />
              </td>
              <td className="px-4 py-3.5 border-b border-white/[0.04]">
                <RiskScore score={v.risk_score} />
              </td>
              <td className="px-4 py-3.5 border-b border-white/[0.04] text-sm text-[#94a3b8] capitalize">
                {v.document_type.replace(/_/g, " ")}
              </td>
              <td className="px-4 py-3.5 border-b border-white/[0.04] text-xs text-[#64748b] whitespace-nowrap">
                {new Date(v.created_at).toLocaleDateString()}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
