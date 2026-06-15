import { useMemo, useState } from "react";
import { generateCurl } from "../lib/curl";
import { useTabStore } from "../store/tabStore";
import { Modal, ModalHeader } from "./ImportModal";
import { Button } from "./ui/Button";

interface ExportCurlModalProps {
  onClose: () => void;
}

export function ExportCurlModal({ onClose }: ExportCurlModalProps) {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const activeTab = tabs.find((t) => t.id === activeTabId);

  const [copied, setCopied] = useState(false);

  const curl = activeTab ? generateCurl(activeTab.request) : "";

  const curlTokens = useMemo(() => {
    const parts = curl.split(" ");
    return parts.map((token, i) => {
      let style: React.CSSProperties;
      if (i === 0) {
        style = { color: "var(--accent)", fontWeight: 700 };
      } else if (token.startsWith("-")) {
        style = { color: "var(--hljs-attr)" };
      } else if (token.startsWith('"') || token.startsWith("'")) {
        style = { color: "var(--hljs-string)" };
      } else {
        style = { color: "var(--text-primary)" };
      }
      return { token, style, key: `ct-${i}` };
    });
  }, [curl]);

  const handleCopy = async () => {
    if (!curl) return;
    await navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal onClose={onClose} width={480} position="right">
      <ModalHeader title="Export as cURL" onClose={onClose} />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "20px 20px 0",
          minHeight: 0,
        }}
      >
        {/* Label */}
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
          Generated cURL Command
        </div>

        {/* Preview box */}
        {curl ? (
          <pre
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              borderRadius: 9,
              padding: "14px 16px",
              fontFamily: "var(--font-mono)",
              fontSize: 12.5,
              lineHeight: 1.75,
              color: "var(--text-primary)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              margin: 0,
            }}
          >
            {/* Colorize: keyword "curl", flags, URL */}
            {curlTokens.map(({ token, style, key }) => (
              <span key={key} style={style}>
                {token}{" "}
              </span>
            ))}
          </pre>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-base)",
              border: "1px solid var(--border)",
              borderRadius: 9,
              color: "var(--text-secondary)",
              fontSize: 13,
            }}
          >
            No active request
          </div>
        )}

        <div style={{ height: 20 }} />
      </div>

      {/* Footer */}
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
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleCopy}
          disabled={!curl}
          style={{ minWidth: 100 }}
        >
          {copied ? (
            <>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              Copy cURL
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
}
