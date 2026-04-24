"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const EXPANDED_WIDTH = 240;
const COLLAPSED_WIDTH = 64;
const LS_COLLAPSE_KEY = "veridian_sidebar_collapsed";

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
    href: "/dashboard/webhooks",
    label: "Webhooks",
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
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

// ─── Profile popup ──────────────────────────────────────────────────────────

interface ProfileMenuProps {
  userEmail: string;
  onClose: () => void;
  onSignOut: () => void;
}

function ProfileMenu({ userEmail, onClose, onSignOut }: ProfileMenuProps) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        left: "12px",
        width: "220px",
        backgroundColor: "#111916",
        border: "1px solid rgba(29,158,117,0.30)",
        borderRadius: "12px",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.4)",
        zIndex: 60,
        overflow: "hidden",
      }}
    >
      <div className="px-4 py-3">
        <p className="text-xs truncate" style={{ color: "#5a7268" }} title={userEmail}>
          {userEmail}
        </p>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

      <div className="py-1.5">
        <MenuLink
          href="/dashboard/settings"
          label="Settings"
          onClick={onClose}
          icon={
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <MenuLink
          href="/dashboard/help"
          label="Help"
          onClick={onClose}
          icon={
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth={2} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 17h.01" />
            </svg>
          }
        />
        <MenuLink
          href="https://veridian-web-rho.vercel.app/docs"
          label="Docs"
          external
          onClick={onClose}
          icon={
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
        />
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />

      <div className="py-1.5">
        <MenuButton
          label="Sign out"
          danger
          onClick={onSignOut}
          icon={
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          }
        />
      </div>
    </div>
  );
}

// ─── Shared menu item primitives ─────────────────────────────────────────────

function MenuLink({
  href,
  label,
  icon,
  external,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  external?: boolean;
  onClick: () => void;
}) {
  const linkProps = external
    ? {
        target: href.startsWith("mailto:") ? undefined : ("_blank" as const),
        rel: href.startsWith("mailto:") ? undefined : "noopener noreferrer",
      }
    : {};

  return (
    <a
      href={href}
      {...linkProps}
      onClick={onClick}
      className="flex items-center gap-3 mx-1.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-[#a3b3ae] hover:text-[#f0f4f3] hover:bg-[rgba(255,255,255,0.06)]"
    >
      {icon}
      {label}
    </a>
  );
}

function MenuButton({
  label,
  icon,
  danger,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 mx-1.5 px-2.5 py-2 rounded-lg text-sm transition-colors text-[#a3b3ae] ${
        danger
          ? "hover:text-[#dc2626] hover:bg-[rgba(153,27,27,0.15)]"
          : "hover:text-[#f0f4f3] hover:bg-[rgba(255,255,255,0.06)]"
      }`}
      style={{ width: "calc(100% - 12px)" }}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Nav item with collapsed tooltip ─────────────────────────────────────────

function NavItem({
  href,
  label,
  icon,
  active,
  isCollapsed,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}) {
  const [tooltipTop, setTooltipTop] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseEnter() {
    if (!isCollapsed || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setTooltipTop(r.top + r.height / 2);
  }

  return (
    <>
      <div ref={ref} onMouseEnter={handleMouseEnter} onMouseLeave={() => setTooltipTop(null)}>
        <Link
          href={href}
          onClick={onClick}
          className={`flex items-center rounded-lg text-sm font-[510]${
            !active ? " hover:bg-[rgba(255,255,255,0.03)]" : ""
          }`}
          style={{
            height: 36,
            justifyContent: isCollapsed ? "center" : "flex-start",
            padding: isCollapsed
              ? "0"
              : active
              ? "8px 12px 8px calc(12px - 2px)"
              : "8px 12px",
            gap: isCollapsed ? 0 : 10,
            backgroundColor: active ? "rgba(29,158,117,0.08)" : undefined,
            color: active ? "#f0f4f3" : "#a3b3ae",
            borderLeft: active ? "2px solid #1d9e75" : "2px solid transparent",
            transition: "background-color var(--transition-fast), color var(--transition-fast)",
          }}
        >
          {icon}
          {!isCollapsed && label}
        </Link>
      </div>

      {/* Fixed-position tooltip — bypasses sidebar overflow clipping */}
      {tooltipTop !== null && (
        <div
          style={{
            position: "fixed",
            left: COLLAPSED_WIDTH + 8,
            top: tooltipTop,
            transform: "translateY(-50%)",
            backgroundColor: "#111916",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 12,
            fontWeight: 500,
            color: "#f0f4f3",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 200,
          }}
        >
          {label}
        </div>
      )}
    </>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [toggleHovered, setToggleHovered] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Read persisted collapse state after hydration
  useEffect(() => {
    const stored = localStorage.getItem(LS_COLLAPSE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  // On mobile (mobileOpen=true) always show the full sidebar regardless of collapsed state
  const isCollapsed = collapsed && !mobileOpen;
  const sidebarWidth = isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(LS_COLLAPSE_KEY, String(next));
  }

  // Close profile popup on outside click
  useEffect(() => {
    if (!profileOpen) return;
    function handleOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [profileOpen]);

  async function handleSignOut() {
    setProfileOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "??";

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 w-10 h-10 flex items-center justify-center rounded-lg"
        style={{ backgroundColor: "#111916", border: "1px solid rgba(255,255,255,0.08)" }}
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
        className={`flex flex-col shrink-0 h-screen fixed md:relative inset-y-0 left-0 z-50 md:z-auto overflow-y-auto ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{
          width: sidebarWidth,
          backgroundColor: "#0a0f0e",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          transition: "width 200ms ease, transform 200ms ease-in-out",
        }}
      >
        {/* ── Header: logo only — collapse toggle lives in the nav ────────── */}
        <div
          className="shrink-0 flex items-center gap-2 px-3 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Logo — navigates to /dashboard. flex-1 so it fills all header
              space safely; on desktop the chevron is in the nav, not here. */}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 min-w-0 flex-1"
            onClick={() => setMobileOpen(false)}
          >
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
            {/* Text fades out as sidebar collapses */}
            <div
              style={{
                opacity: isCollapsed ? 0 : 1,
                transition: "opacity 100ms ease",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              <p className="text-sm font-semibold leading-tight" style={{ color: "#f0f4f3" }}>
                Veridian
              </p>
              <p className="text-xs leading-tight" style={{ color: "#5a7268" }}>
                Compliance
              </p>
            </div>
          </Link>

          {/* Mobile: close button */}
          <button
            className="md:hidden flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-colors hover:bg-[rgba(255,255,255,0.06)]"
            style={{ color: "#a3b3ae" }}
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Navigation ──────────────────────────────────────────────────── */}
        <nav className="flex-1 px-2 py-5">
          {!isCollapsed && (
            <p
              className="px-3 mb-2 text-[10px] font-medium uppercase"
              style={{ color: "#5a7268", letterSpacing: "0.12em" }}
            >
              Navigation
            </p>
          )}
          <div className="space-y-0.5">
            {NAV.map(({ href, label, icon }) => {
              const active =
                href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(href);
              return (
                <NavItem
                  key={href}
                  href={href}
                  label={label}
                  icon={icon}
                  active={active}
                  isCollapsed={isCollapsed}
                  onClick={() => setMobileOpen(false)}
                />
              );
            })}
          </div>

        </nav>

        {/* ── Profile footer ──────────────────────────────────────────────── */}
        <div
          ref={profileRef}
          className="shrink-0 sticky bottom-0"
          style={{
            position: "relative",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            backgroundColor: "#0a0f0e",
            paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
          }}
        >
          {profileOpen && (
            <ProfileMenu
              userEmail={userEmail}
              onClose={() => setProfileOpen(false)}
              onSignOut={handleSignOut}
            />
          )}

          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-3 w-full text-left"
            style={{
              padding: isCollapsed ? "12px 0 4px" : "12px 16px 4px",
              justifyContent: isCollapsed ? "center" : "flex-start",
            }}
            aria-expanded={profileOpen}
            aria-haspopup="true"
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
              style={{ backgroundColor: "#1d9e75", color: "#050a09" }}
            >
              {initials}
            </div>

            {/* Email + chevron — hidden when collapsed */}
            {!isCollapsed && (
              <>
                <p className="text-xs truncate flex-1 text-left" style={{ color: "#5a7268" }}>
                  {userEmail}
                </p>
                <svg
                  className="w-3.5 h-3.5 shrink-0 transition-transform duration-150"
                  style={{
                    color: "#5a7268",
                    transform: profileOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── Desktop collapse toggle — Linear-style floating circle ─────────
          Fixed position so it isn't clipped by the sidebar's overflow-y.
          Tracks sidebar width with the same 200ms ease transition.        */}
      <button
        className="hidden md:flex items-center justify-center fixed z-20 rounded-full"
        onClick={toggleCollapsed}
        onMouseEnter={() => setToggleHovered(true)}
        onMouseLeave={() => setToggleHovered(false)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        style={{
          width: 24,
          height: 24,
          left: sidebarWidth - 12,
          top: "50%",
          transform: "translateY(-50%)",
          backgroundColor: toggleHovered ? "#1a2b25" : "#111916",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#a3b3ae",
          cursor: "pointer",
          transition: "left 200ms ease, background-color 150ms ease",
        }}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d={collapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}
          />
        </svg>
      </button>
    </>
  );
}
