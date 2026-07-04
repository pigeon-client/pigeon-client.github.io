import pigeonLogo from "@/assets/pigeon-logo-64.png";
import { useTabStore } from "../store";

export function EmptyRequestState() {
  const addTab = useTabStore((s) => s.addTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);

  const hints = [
    { keys: ["⌘", "N"], label: "New tab" },
    { keys: ["⌘", "Enter"], label: "Send request" },
    { keys: ["⌘", "F"], label: "Search sidebar" },
    { keys: ["⌘", ","], label: "Settings" },
  ];

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base)",
        gap: 0,
        userSelect: "none",
      }}
    >
      {/* Icon */}
      <img
        src={pigeonLogo}
        alt="Pigeon"
        className="pg-logo"
        style={{
          width: 72,
          height: 72,
          objectFit: "contain",
          marginBottom: 20,
        }}
      />

      <div
        style={{
          fontSize: "var(--text-lg)",
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: 8,
          letterSpacing: "-0.02em",
        }}
      >
        No request open
      </div>
      <div
        style={{
          fontSize: "var(--text-code)",
          color: "var(--text-secondary)",
          marginBottom: 32,
          textAlign: "center",
          maxWidth: 280,
          lineHeight: 1.6,
        }}
      >
        Enter a URL in the bar above, open a request from the sidebar, or start a new one.
      </div>

      {/* New request CTA */}
      <button
        type="button"
        onClick={() => {
          const id = addTab();
          setActiveTab(id);
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 38,
          padding: "0 20px",
          background: "var(--primary)",
          border: "none",
          borderRadius: "var(--radius)",
          color: "var(--primary-foreground)",
          fontFamily: "inherit",
          fontSize: "var(--text-code)",
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: 40,
          boxShadow: "0 4px 16px color-mix(in srgb, var(--accent) 40%, transparent)",
          transition: "opacity 0.1s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = "0.85";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = "1";
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        New Request
      </button>

      {/* Keyboard hints */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: "16px 24px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
        }}
      >
        {hints.map(({ keys, label }) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
            }}
          >
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)" }}>
              {label}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              {keys.map((k) => (
                <span
                  key={k}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 22,
                    height: 20,
                    padding: "0 5px",
                    background: "var(--bg-input)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-2xs)",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {k}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
