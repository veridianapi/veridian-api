"use client";

import { usePathname } from "next/navigation";

const PAGE_LABELS: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/verifications": "Verifications",
  "/dashboard/api-keys": "API Keys",
  "/dashboard/webhooks": "Webhooks",
  "/dashboard/billing": "Billing",
  "/dashboard/settings": "Settings",
  "/dashboard/help": "Help",
};

function getLabel(pathname: string): string {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname];
  // Dynamic routes like /dashboard/verifications/[id]
  const match = Object.entries(PAGE_LABELS).find(([key]) => pathname.startsWith(key + "/"));
  return match ? match[1] : "Dashboard";
}

export default function Topbar() {
  const pathname = usePathname();
  const label = getLabel(pathname);

  return (
    <header className="h-11 shrink-0 flex items-center border-b border-white/[0.06] px-6 gap-[14px] bg-[#050a09]">
      <div className="flex items-center gap-2 text-[12px] text-[#5a7268]">
        <span>Veridian</span>
        <span className="opacity-50">/</span>
        <span>Compliance</span>
        <span className="opacity-50">/</span>
        <span className="text-[#a3b3ae]">{label}</span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Search */}
        <div className="flex items-center gap-2 w-[200px] h-[28px] px-2 border border-white/[0.06] rounded-[5px] text-[12px] text-[#5a7268] cursor-pointer hover:border-white/10 transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
          </svg>
          <span>Search…</span>
          <span className="ml-auto font-mono text-[10px] text-[#5a7268] border border-white/[0.06] rounded px-1 py-0.5">⌘K</span>
        </div>

        {/* Env pill */}
        <div className="flex items-center gap-1.5 h-[28px] px-2 border border-white/[0.06] rounded-[5px] font-mono text-[11px] text-[#a3b3ae] cursor-pointer hover:bg-white/[0.03] transition-colors">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1d9e75]" />
          live
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </div>

        {/* Notification bell */}
        <button className="w-7 h-7 flex items-center justify-center rounded-[5px] text-[#a3b3ae] hover:bg-white/[0.04] hover:text-[#f0f4f3] transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
          </svg>
        </button>
      </div>
    </header>
  );
}
