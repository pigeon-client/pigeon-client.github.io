import { useMemo, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Modal, ModalFooter, ModalHeader } from "@/shared/ui/Modal";
import { useTabStore } from "@/store/tabStore";
import { generateCurl } from "../lib/generateCurl";

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
      let className: string;
      if (i === 0) {
        className = "font-bold text-primary";
      } else if (token.startsWith("-")) {
        className = "text-[color:var(--hljs-attr)]";
      } else if (token.startsWith('"') || token.startsWith("'")) {
        className = "text-[color:var(--hljs-string)]";
      } else {
        className = "text-foreground";
      }
      return { token, className, key: `ct-${i}` };
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

      <div className="flex min-h-0 flex-1 flex-col px-5 pt-5">
        {/* Label */}
        <div className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          Generated cURL Command
        </div>

        {/* Preview box */}
        {curl ? (
          <pre className="m-0 min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap break-all rounded border border-border bg-card p-3.5 font-mono text-xs leading-relaxed text-foreground">
            {curlTokens.map(({ token, className, key }) => (
              <span key={key} className={className}>
                {token}{" "}
              </span>
            ))}
          </pre>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded border border-border bg-card text-sm text-muted-foreground">
            No active request
          </div>
        )}

        <div className="h-5" />
      </div>

      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleCopy}
          disabled={!curl}
          className="min-w-[100px]"
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
      </ModalFooter>
    </Modal>
  );
}
