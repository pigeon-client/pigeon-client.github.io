import { useState } from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Modal, ModalFooter, ModalHeader } from "@/shared/ui/Modal";
import { useTabStore } from "@/store/tabStore";
import { parseCurl } from "../services/curlService";

interface ImportModalProps {
  onClose: () => void;
}

function parsedPreview(raw: string): { method: string; url: string } | null {
  try {
    const p = parseCurl(raw);
    if (!p) return null;
    return { method: p.method ?? "GET", url: p.url ?? "" };
  } catch {
    return null;
  }
}

const METHOD_TEXT: Record<string, string> = {
  GET: "text-method-get",
  POST: "text-method-post",
  PUT: "text-method-put",
  PATCH: "text-method-patch",
  DELETE: "text-method-delete",
  HEAD: "text-method-head",
  OPTIONS: "text-method-options",
};

export function ImportModal({ onClose }: ImportModalProps) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const addTab = useTabStore((s) => s.addTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const updateTabRequest = useTabStore((s) => s.updateTabRequest);

  const preview = raw.trim() ? parsedPreview(raw) : null;
  const methodClass = preview ? (METHOD_TEXT[preview.method] ?? "text-method-options") : "";

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

  return (
    <Modal onClose={onClose} width={480} position="right">
      <ModalHeader title="Import from cURL" onClose={onClose} />

      <div className="px-5 pt-5">
        <div className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">
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
          className="h-[136px] w-full resize-none rounded border border-border bg-card px-3.5 py-3 font-mono text-xs leading-relaxed text-foreground outline-none focus:border-primary"
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "")}
        />
        {error && (
          <div className="mt-2.5 flex items-center gap-2 rounded border border-destructive/30 bg-destructive/10 px-3 py-2">
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
              className="text-destructive"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="text-xs text-destructive">{error}</span>
          </div>
        )}

        {/* Parse preview */}
        {preview && !error && (
          <div className="mt-2.5 flex items-center gap-2.5 rounded border border-status-2xx/20 bg-status-2xx/5 px-3.5 py-2.5">
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
              className="text-status-2xx"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span className={cn("shrink-0 font-mono text-[11.5px] font-semibold", methodClass)}>
              {preview.method}
            </span>
            <span className="truncate font-mono text-xs text-muted-foreground">{preview.url}</span>
          </div>
        )}
        <div className="h-5" />
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
