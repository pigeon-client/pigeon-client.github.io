/* ── Response headers list ── */
export function HeadersTable({ headers }: { headers: Record<string, string> }) {
  return (
    <div style={{ padding: "8px 18px" }}>
      {Object.entries(headers).map(([key, value]) => (
        <div
          key={key}
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 14,
            padding: "8px 4px",
            borderBottom: "1px solid var(--border)",
            cursor: "pointer",
          }}
          className="hover:bg-[var(--bg-elevated)]"
        >
          <span
            style={{
              flexShrink: 0,
              width: 200,
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--method-get)",
            }}
          >
            {key}
          </span>
          <span
            style={{
              flex: 1,
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--text-primary)",
              wordBreak: "break-all",
            }}
          >
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}
