"use client";
import { useEffect, useState } from "react";

const STORAGE_KEY = "veridian_announcement_v1_dismissed";

export default function AnnouncementBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-[#1d9e75]/[0.08] border border-[#1d9e75]/[0.20] mb-2">
      <p className="text-[13px] text-[#94a3b8]">
        Veridian <span className="text-[#1d9e75] font-medium">v1.0</span> — KYC verification, sanctions
        screening, and AML. 14-day free trial, no credit card needed.
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="flex items-center justify-center w-5 h-5 shrink-0 text-[#64748b] hover:text-[#94a3b8] transition-colors"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
