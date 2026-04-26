"use client";
import { useEffect, useState } from "react";

const STORAGE_KEY = "veridian_announcement_v1_dismissed";

export default function AnnouncementBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  return (
    <div
      style={{
        backgroundColor: "rgba(29,158,117,0.10)",
        border: "1px solid rgba(29,158,117,0.25)",
        borderRadius: 8,
        padding: "10px 16px",
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <p style={{ fontSize: 13, color: "#a3b3ae", margin: 0 }}>
        Veridian <span style={{ color: "#1d9e75" }}>v1.0</span> — KYC verification, sanctions
        screening, and AML. 14-day free trial, no credit card needed.
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss announcement"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#5a7268",
          padding: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
