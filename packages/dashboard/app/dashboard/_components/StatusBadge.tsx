const classMap: Record<string, string> = {
  approved: "vd-badge-approved",
  review:   "vd-badge-review",
  rejected: "vd-badge-rejected",
  pending:  "vd-badge-pending",
};

export function StatusBadge({ status }: { status: string }) {
  const modifier = classMap[status] ?? "vd-badge-pending";
  return (
    <span className={`vd-badge ${modifier}`}>
      {status}
    </span>
  );
}
