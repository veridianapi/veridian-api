const config: Record<string, { dot: string; label: string; text: string }> = {
  approved: { dot: "bg-[#10b981]", label: "PASS",    text: "text-[#10b981]" },
  review:   { dot: "bg-[#f59e0b]", label: "REVIEW",  text: "text-[#f59e0b]" },
  rejected: { dot: "bg-[#ef4444]", label: "BLOCK",   text: "text-[#ef4444]" },
  pending:  { dot: "bg-[#64748b]", label: "PENDING", text: "text-[#64748b]" },
};

export function StatusBadge({ status }: { status: string }) {
  const { dot, label, text } = config[status] ?? config.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.04em] ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {label}
    </span>
  );
}
