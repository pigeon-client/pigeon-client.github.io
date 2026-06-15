import { useState } from "react";
import { parseCurl } from "../lib/curlParser";
import { useTabStore } from "../store/tabStore";
import { Button } from "./ui/Button";

interface ImportModalProps {
  onClose: () => void;
}

/* Shared modal shell */
function Modal({
  onClose,
  width = 600,
  position = "center",
  children,
}: {
  onClose: () => void;
  width?: number;
  position?: "center" | "right";
  children: React.ReactNode;
}) {
  if (position === "right") {
    return (
      // biome-ignore lint/a11y/useSemanticElements: Backdrop overlay wraps content, not a simple button
      <div
        role="button"
        tabIndex={0}
        aria-label="Close modal"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClose();
          }
        }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width,
            maxWidth: "90vw",
            background: "var(--bg-elevated)",
            borderLeft: "1px solid var(--border)",
            boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "pgSlideRight 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: Backdrop overlay wraps content, not a simple button
    <div
      role="button"
      tabIndex={0}
      aria-label="Close modal"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        animation: "pgFade 120ms ease-out",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        style={{
          width,
          maxWidth: "calc(100vw - 48px)",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "pgSlide 150ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        height: 52,
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{title}</span>
      <Button
        variant="ghost-icon"
        size="icon"
        onClick={onClose}
        style={{ width: 28, height: 28, borderRadius: 6 }}
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
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </Button>
    </div>
  );
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 10,
        padding: "14px 20px",
        borderTop: "1px solid var(--border)",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

export { Modal };

/* ── Import Modal ── */
function parsedPreview(raw: string): { method: string; url: string } | null {
  try {
    const p = parseCurl(raw);
    if (!p) return null;
    return { method: p.method ?? "GET", url: p.url ?? "" };
  } catch {
    return null;
  }
}

export function ImportModal({ onClose }: ImportModalProps) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const addTab = useTabStore((s) => s.addTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const updateTabRequest = useTabStore((s) => s.updateTabRequest);

  const preview = raw.trim() ? parsedPreview(raw) : null;

  const handleImport = () => {
    if (!raw.trim()) {
      setError("Paste a cURL command first");
      return;
    }
    const parsed = parseCurl(raw);
    if (!parsed) {
      setError("Could not parse this cURL. Make sure it starts with 'curl' and has a URL.");
      return;
    }
    const id = addTab();
    updateTabRequest(id, parsed);
    setActiveTab(id);
    onClose();
  };

  const METHOD_COLORS: Record<string, string> = {
    GET: "#4A9EFA",
    POST: "#4ADE80",
    PUT: "#FB923C",
    PATCH: "#FBBF24",
    DELETE: "#F87171",
    HEAD: "#C084FC",
    OPTIONS: "#94A3B8",
  };

  return (
    <Modal onClose={onClose} width={480} position="right">
      <ModalHeader title="Import from cURL" onClose={onClose} />

      <div style={{ padding: "20px 20px 0" }}>
        <div
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: "var(--text-secondary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 10,
          }}
        >
          cURL Command
        </div>
        <textarea
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            setError("");
          }}
          placeholder={
            "curl https://api.example.com/users \\\n  -H 'Authorization: Bearer token' \\\n  -d '{\"name\":\"John\"}'"
          }
          spellCheck={false}
          style={{
            width: "100%",
            height: 136,
            resize: "none",
            background: "var(--bg-base)",
            border: "1px solid var(--border)",
            borderRadius: 9,
            padding: "12px 14px",
            fontFamily: "var(--font-mono)",
            fontSize: 12.5,
            lineHeight: 1.7,
            color: "var(--text-primary)",
            outline: "none",
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--accent)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
          }}
        />
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 10,
              padding: "9px 12px",
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: 7,
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#F87171"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ fontSize: 12.5, color: "#F87171" }}>{error}</span>
          </div>
        )}

        {/* Parse preview */}
        {preview && !error && (
          <div
            style={{
              marginTop: 10,
              padding: "10px 14px",
              background: "rgba(74,222,128,0.06)",
              border: "1px solid rgba(74,222,128,0.2)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#4ADE80"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
                flexShrink: 0,
                color: METHOD_COLORS[preview.method] ?? "#94A3B8",
              }}
            >
              {preview.method}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--text-secondary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {preview.url}
            </span>
          </div>
        )}
        <div style={{ height: 20 }} />
      </div>

      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={handleImport} disabled={!raw.trim()}>
          Import Request
        </Button>
      </ModalFooter>
    </Modal>
  );
}
