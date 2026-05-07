"use client";

import { useRouter } from "next/navigation";

const RANGES = ["24H", "7D", "30D", "90D"] as const;
type Range = typeof RANGES[number];

export function RangeSelector({
  selected,
  basePath = "/dashboard",
  extraParams,
}: {
  selected: string;
  basePath?: string;
  extraParams?: Record<string, string>;
}) {
  const router = useRouter();
  const active = selected.toUpperCase() as Range;

  function select(range: Range) {
    const params = new URLSearchParams({ range: range.toLowerCase(), ...extraParams });
    router.replace(`${basePath}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex border border-white/[0.06] rounded-[5px] overflow-hidden">
      {RANGES.map((seg) => (
        <button
          key={seg}
          onClick={() => select(seg)}
          className={`px-[10px] py-1 text-[11px] font-mono cursor-pointer border-r border-white/[0.06] last:border-0 transition-colors
            ${seg === active
              ? "bg-white/[0.04] text-[#f0f4f3]"
              : "text-[#5a7268] hover:text-[#a3b3ae]"
            }`}
        >
          {seg}
        </button>
      ))}
    </div>
  );
}
