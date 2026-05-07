"use client";

import { useState } from "react";

type Tab = "front" | "back" | "selfie";

export function DocumentTabs({
  hasBack,
  docType,
  nationality,
}: {
  hasBack: boolean;
  docType: string;
  nationality: string | null;
}) {
  const [active, setActive] = useState<Tab>("front");

  const tabs: Tab[] = ["front", ...(hasBack ? (["back"] as Tab[]) : []), "selfie"];

  const hint =
    active === "selfie"
      ? "Selfie · 1080 × 1080"
      : `${docType}${nationality ? ` · ${nationality}` : ""} · 1842 × 1180${active === "back" ? " (back)" : ""}`;

  return (
    <>
      {/* Card header with tabs */}
      <div className="flex items-center px-[14px] py-[10px] border-b border-white/[0.06] gap-[10px]">
        <span className="text-[12.5px] font-semibold text-[#f0f4f3] tracking-[-0.005em]">Document</span>
        <div className="ml-auto flex border border-white/[0.06] rounded-[5px] overflow-hidden">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActive(tab)}
              className={`px-3 py-1 text-[11.5px] font-medium border-r border-white/[0.06] last:border-0 capitalize transition-colors ${
                active === tab
                  ? "bg-white/[0.04] text-[#f0f4f3]"
                  : "text-[#5a7268] hover:text-[#a3b3ae]"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Image area */}
      <div className="p-[14px]">
        <div
          className="relative rounded-[5px] border border-white/[0.06] overflow-hidden"
          style={{
            aspectRatio: "16/10",
            background: "repeating-linear-gradient(135deg, #0d1311 0 8px, #0a100e 8px 16px)",
          }}
        >
          {/* Corner brackets */}
          <span className="absolute top-2 left-2 w-[18px] h-[18px] border-t border-l border-white/10 opacity-50" />
          <span className="absolute top-2 right-2 w-[18px] h-[18px] border-t border-r border-white/10 opacity-50" />
          <span className="absolute bottom-2 left-2 w-[18px] h-[18px] border-b border-l border-white/10 opacity-50" />
          <span className="absolute bottom-2 right-2 w-[18px] h-[18px] border-b border-r border-white/10 opacity-50" />
          {/* Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.25) 100%)" }}
          />
          {/* Hint */}
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px] text-[#5a7268] tracking-[0.04em] uppercase z-10">
            {hint}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center justify-between mt-[10px] font-mono text-[11px] text-[#5a7268] gap-[10px]">
          <span className="overflow-hidden text-ellipsis whitespace-nowrap min-w-0">
            sha256 <span className="text-[#a3b3ae] font-medium">4f8b91c4d6e0a7b2…3f1c8e92</span>
          </span>
          <span className="inline-flex gap-3 shrink-0">
            <span className="hover:text-[#f0f4f3] cursor-pointer transition-colors">Download</span>
            <span className="hover:text-[#f0f4f3] cursor-pointer transition-colors">Open original</span>
          </span>
        </div>
      </div>
    </>
  );
}
