export function EmptyState({
  icon,
  label,
  sub,
  action,
}: {
  icon: string;
  label: string;
  sub?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        textAlign: "center",
        gap: 6,
      }}
    >
      <span style={{ fontSize: "var(--text-2xl)" }}>{icon}</span>
      <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: 500 }}>
        {label}
      </span>
      {sub && (
        <span
          style={{ fontSize: "var(--text-2xs)", color: "var(--text-secondary)", lineHeight: 1.5 }}
        >
          {sub}
        </span>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            marginTop: 6,
            background: "transparent",
            border: "none",
            color: "var(--primary)",
            fontSize: "var(--text-xs)",
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: 500,
            padding: 0,
          }}
          className="hover:underline"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
