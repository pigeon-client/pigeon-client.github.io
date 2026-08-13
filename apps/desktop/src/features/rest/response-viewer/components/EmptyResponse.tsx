import { Send } from "lucide-react";
import { useTabStore } from "@/features/rest/request-builder";
import { clickVisibleSendButton } from "@/shared/lib/sendButton";

/* ── Empty state ── */
export function EmptyResponse() {
  const hasUrl = useTabStore((s) => {
    const t = s.tabs.find((tab) => tab.id === s.activeTabId);
    return Boolean(t?.request.url.trim());
  });

  return (
    <div
      data-testid="response-empty"
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "48px 24px",
      }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--text-secondary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 0.4 }}
        aria-hidden="true"
      >
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </svg>
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 500,
            color: "var(--text-secondary)",
            margin: "0 0 4px",
          }}
        >
          {hasUrl ? "Ready to send" : "No response yet"}
        </p>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", margin: 0 }}>
          {hasUrl
            ? "Run this request to see the response here"
            : "Enter a URL above to get started"}
        </p>
      </div>
      {hasUrl && (
        <button
          type="button"
          onClick={() => {
            clickVisibleSendButton();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            height: 28,
            padding: "0 12px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "var(--text-secondary)",
            fontFamily: "inherit",
            fontSize: "var(--text-xs)",
            cursor: "pointer",
            transition: "all 0.1s",
          }}
          className="hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
        >
          <Send size={12} />
          Send request
          <kbd
            style={{
              marginLeft: 2,
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-2xs)",
              color: "var(--text-secondary)",
              opacity: 0.7,
            }}
          >
            ⌘↵
          </kbd>
        </button>
      )}
    </div>
  );
}
