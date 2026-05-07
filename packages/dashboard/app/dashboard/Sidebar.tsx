"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const PRIMARY_NAV = [
  {
    href: "/dashboard",
    label: "Overview",
    exact: true,
    icon: (
      <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/>
        <rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/verifications",
    label: "Verifications",
    icon: (
      <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/api-keys",
    label: "API Keys",
    icon: (
      <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7.5" cy="15.5" r="3.5"/><path d="m10 13 9-9"/><path d="m17 6 3 3"/><path d="m14 9 3 3"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/webhooks",
    label: "Webhooks",
    icon: (
      <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 11.5a6.5 6.5 0 1 0-11.5 4.1"/><path d="M14 12a4 4 0 1 1-7.3 2.3"/>
        <path d="M11 13.5 6.7 21"/><path d="M8 14.5 3.7 22"/><path d="M14 8.5l4.3-7.5"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/billing",
    label: "Billing",
    icon: (
      <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/help",
    label: "Help",
    icon: (
      <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5"/>
        <circle cx="12" cy="17" r=".5" fill="currentColor"/>
      </svg>
    ),
  },
];

const WORKSPACE_NAV = [
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: (
      <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.36.16.69.39 1 .68"/>
      </svg>
    ),
  },
];

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = (() => {
    const prefix = userEmail.split("@")[0];
    const parts = prefix.split(/[._\-+]/);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : prefix.slice(0, 2).toUpperCase();
  })();

  function isActive(href: string, exact = false) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="w-[220px] shrink-0 sticky top-0 h-screen flex flex-col border-r border-white/[0.06] bg-[#050a09] py-4 px-3">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 pb-[18px]">
        <span className="text-[#1d9e75]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5l-8-3z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </span>
        <span className="text-[14px] font-semibold tracking-[-0.015em] text-[#f0f4f3]">Veridian</span>
        <span className="ml-auto font-mono text-[10px] text-[#5a7268] border border-white/[0.06] rounded px-1.5 py-0.5">v4</span>
      </div>

      {/* Primary nav */}
      <nav className="flex flex-col gap-px">
        {PRIMARY_NAV.map(({ href, label, icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-[10px] px-2 py-[6px] rounded-[5px] text-[13px] transition-colors duration-75 select-none
                ${active
                  ? "bg-white/[0.04] text-[#f0f4f3] font-medium"
                  : "text-[#a3b3ae] hover:bg-white/[0.03] hover:text-[#f0f4f3] font-[450]"
                }`}
            >
              <span className={`shrink-0 ${active ? "text-[#f0f4f3]" : "text-[#5a7268]"}`}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Workspace section */}
      <p className="text-[10px] font-medium text-[#5a7268] uppercase tracking-[0.06em] px-2 pt-[14px] pb-[6px]">Workspace</p>
      <nav className="flex flex-col gap-px">
        {WORKSPACE_NAV.map(({ href, label, icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-[10px] px-2 py-[6px] rounded-[5px] text-[13px] transition-colors duration-75 select-none
                ${active
                  ? "bg-white/[0.04] text-[#f0f4f3] font-medium"
                  : "text-[#a3b3ae] hover:bg-white/[0.03] hover:text-[#f0f4f3] font-[450]"
                }`}
            >
              <span className={`shrink-0 ${active ? "text-[#f0f4f3]" : "text-[#5a7268]"}`}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="mt-auto pt-3 border-t border-white/[0.06] relative">
        {menuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#111916] border border-white/[0.08] rounded-lg overflow-hidden shadow-lg z-50">
            <Link
              href="/dashboard/settings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2.5 text-[12px] text-[#a3b3ae] hover:bg-white/[0.04] hover:text-[#f0f4f3] transition-colors"
            >
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-[12px] text-[#a3b3ae] hover:bg-white/[0.04] hover:text-[#f0f4f3] transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="w-full flex items-center gap-[10px] px-2 py-[6px] rounded-[5px] hover:bg-white/[0.03] transition-colors text-left"
        >
          <div className="w-6 h-6 rounded-full bg-[#1d2926] flex items-center justify-center text-[11px] font-semibold text-[#f0f4f3] shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-[#f0f4f3] leading-[1.2] truncate">
              {userEmail.split("@")[0]}
            </p>
            <p className="text-[11px] text-[#5a7268] leading-[1.3] truncate">{userEmail}</p>
          </div>
          <svg className="shrink-0 text-[#5a7268]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 9l4-4 4 4"/><path d="M16 15l-4 4-4-4"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}
