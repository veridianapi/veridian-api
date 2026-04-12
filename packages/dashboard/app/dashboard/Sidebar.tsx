"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const NAV = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/dashboard/verifications",
    label: "Verifications",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/api-keys",
    label: "API Keys",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/billing",
    label: "Billing",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
];

const SUPPORT_LINKS = [
  {
    href: "https://veridian-web-rho.vercel.app/docs",
    label: "Docs",
    external: true,
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    href: "mailto:support@veridian.dev",
    label: "Get help",
    external: true,
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" strokeWidth={2} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 17h.01" />
      </svg>
    ),
  },
];

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signOutHover, setSignOutHover] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "??";

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 w-10 h-10 flex items-center justify-center rounded-lg"
        style={{ backgroundColor: "#111916", border: "1px solid #1a2b25" }}
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="#a3b3ae" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`flex flex-col shrink-0 h-screen fixed md:relative inset-y-0 left-0 z-50 md:z-auto transition-transform duration-200 ease-in-out overflow-y-auto ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{ width: "240px", backgroundColor: "#0a0f0e" }}
      >
        {/* Logo / Header */}
        <div className="px-5 py-6 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            {/* Close button on mobile */}
            <button
              className="md:hidden absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ color: "#a3b3ae" }}
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Shield icon */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: "rgba(29,158,117,0.15)" }}
            >
              <svg className="w-5 h-5" fill="none" stroke="#1d9e75" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">Veridian</p>
              <p className="text-xs leading-tight" style={{ color: "#5a7068" }}>
                Compliance
              </p>
            </div>
          </div>
        </div>

        {/* Navigation — flex-1 so it fills available space */}
        <nav className="flex-1 px-3 py-5">
          <p
            className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "#3d5249" }}
          >
            Navigation
          </p>
          <div className="space-y-0.5">
            {NAV.map(({ href, label, icon }) => {
              const active =
                href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(href);

              if (active) {
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      paddingLeft: "calc(0.75rem - 2px)",
                      paddingRight: "0.75rem",
                      backgroundColor: "rgba(29,158,117,0.10)",
                      color: "#1d9e75",
                      borderLeft: "2px solid #1d9e75",
                    }}
                  >
                    {icon}
                    {label}
                  </Link>
                );
              }

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:text-white"
                  style={{ color: "#a3b3ae" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  }}
                >
                  {icon}
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Divider + support links */}
          <div className="mt-4 mb-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
          <div className="space-y-0.5">
            {SUPPORT_LINKS.map(({ href, label, icon }) => (
              <a
                key={href}
                href={href}
                target={href.startsWith("mailto:") ? undefined : "_blank"}
                rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:text-white"
                style={{ color: "#a3b3ae" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                }}
              >
                {icon}
                {label}
              </a>
            ))}
          </div>
        </nav>

        {/* Footer — pinned to bottom, never scrolls away */}
        <div
          className="px-4 py-4 shrink-0 sticky bottom-0"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            backgroundColor: "#0a0f0e",
          }}
        >
          {/* Avatar + email */}
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold"
              style={{ backgroundColor: "rgba(29,158,117,0.20)", color: "#1d9e75" }}
            >
              {initials}
            </div>
            <p className="text-xs truncate flex-1" style={{ color: "#6b8078" }}>
              {userEmail}
            </p>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            onMouseEnter={() => setSignOutHover(true)}
            onMouseLeave={() => setSignOutHover(false)}
            className="flex items-center gap-2 w-full px-3 rounded-lg text-xs font-medium transition-colors min-h-[44px]"
            style={{
              color: signOutHover ? "#f87171" : "#4a6059",
              backgroundColor: signOutHover ? "rgba(153,27,27,0.15)" : "transparent",
            }}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
