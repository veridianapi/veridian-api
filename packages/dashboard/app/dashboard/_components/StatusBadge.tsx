const styleMap: Record<string, React.CSSProperties> = {
  approved: { backgroundColor: "rgba(22,163,74,0.12)",   color: "#16a34a" },
  review:   { backgroundColor: "rgba(217,119,6,0.12)",   color: "#d97706" },
  rejected: { backgroundColor: "rgba(220,38,38,0.12)",   color: "#dc2626" },
  pending:  { backgroundColor: "rgba(255,255,255,0.06)", color: "#5a7268" },
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 8px",
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.02em",
        textTransform: "capitalize",
        ...(styleMap[status] ?? { backgroundColor: "rgba(255,255,255,0.06)", color: "#5a7268" }),
      }}
    >
      {status}
    </span>
  );
}
