import pigeonLogo from "@/assets/pigeon-logo-64.png";
import { parseCurl } from "@/features/import-export";
import { useTabStore } from "../store";

/* A ready-to-run sample so the app is never a blank slate. */
const EXAMPLE_CURL =
  'curl https://jsonplaceholder.typicode.com/todos/1 -H "Accept: application/json"';

export function EmptyRequestState() {
  const addTab = useTabStore((s) => s.addTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const updateTabRequest = useTabStore((s) => s.updateTabRequest);

  const loadExample = () => {
    const parsed = parseCurl(EXAMPLE_CURL);
    const id = addTab();
    if (parsed) updateTabRequest(id, parsed);
    setActiveTab(id);
  };

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
        Start from scratch, or try a ready-made sample request to see how it works.
      </div>

      {/* CTAs */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
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

        <button
          type="button"
          onClick={loadExample}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 38,
            padding: "0 18px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--text-primary)",
            fontFamily: "inherit",
            fontSize: "var(--text-code)",
            fontWeight: 600,
            cursor: "pointer",
            transition: "border-color 0.1s, color 0.1s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--primary)";
            e.currentTarget.style.color = "var(--primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          Try an example
        </button>
      </div>

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
