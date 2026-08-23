import { Alert, Button, cn, Modal, ModalFooter, ModalHeader, Textarea } from "@pigeon/ui";
import { Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { RequestConfig } from "@/shared/types";
import { useCollectionStore } from "../../collections/store";
import { parseCurl } from "../services/curlService";
import { type ParsedPostmanCollection, parsePostmanCollection } from "../services/postmanImporter";

interface ImportModalProps {
  onClose: () => void;
  /** Open the parsed request in the workspace (owned by the caller — keeps this
   *  feature from depending on request-builder's tab store). */
  onImportRequest: (parsed: Partial<RequestConfig>) => void;
}

type ImportMode = "curl" | "postman";

const METHOD_TEXT: Record<string, string> = {
  GET: "text-method-get",
  POST: "text-method-post",
  PUT: "text-method-put",
  PATCH: "text-method-patch",
  DELETE: "text-method-delete",
  HEAD: "text-method-head",
  OPTIONS: "text-method-options",
  QUERY: "text-method-query",
};

export function ImportModal({ onClose, onImportRequest }: ImportModalProps) {
  const [mode, setMode] = useState<ImportMode>("curl");
  const [raw, setRaw] = useState("");
  const [postmanRaw, setPostmanRaw] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ method: string; url: string } | null>(null);
  const importCollection = useCollectionStore((s) => s.importCollection);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    void parseCurl(raw)
      .then((parsed) => {
        if (cancelled) return;
        setPreview(parsed ? { method: parsed.method ?? "GET", url: parsed.url ?? "" } : null);
      })
      .catch(() => {
        if (!cancelled) setPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [raw]);

  const methodClass = preview ? (METHOD_TEXT[preview.method] ?? "text-method-options") : "";

  let postmanPreview: ParsedPostmanCollection | null = null;
  let postmanParseFailed = false;
  if (postmanRaw.trim()) {
    postmanPreview = parsePostmanCollection(postmanRaw);
    postmanParseFailed = postmanPreview === null;
  }

  const switchMode = (next: ImportMode) => {
    setMode(next);
    setError("");
  };

  const handleFileChosen = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setPostmanRaw(String(reader.result ?? ""));
      setError("");
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (mode === "curl") {
      if (!raw.trim()) {
        setError("Paste a cURL command first");
        return;
      }
      void parseCurl(raw).then((parsed) => {
        if (!parsed) {
          setError("Could not parse this cURL. Make sure it starts with 'curl' and has a URL.");
          return;
        }
        onImportRequest(parsed);
        onClose();
      });
      return;
    }

    if (!postmanRaw.trim()) {
      setError("Paste or upload a Postman collection export first");
      return;
    }
    const parsed = parsePostmanCollection(postmanRaw);
    if (!parsed) {
      setError(
        "Could not parse this file. Export a collection as Postman Collection v2.1 (JSON) and try again.",
      );
      return;
    }
    importCollection(parsed.name, parsed.root);
    onClose();
  };

  return (
    <Modal onClose={onClose} width={520}>
      <ModalHeader
        title={mode === "curl" ? "Import from cURL" : "Import Postman Collection"}
        onClose={onClose}
      />

      <div className="max-h-[min(480px,calc(100vh-180px))] overflow-y-auto px-5 pt-5 pb-4">
        <div className="mb-3.5 flex rounded border border-border bg-card p-0.5">
          {(
            [
              ["curl", "cURL"],
              ["postman", "Postman Collection"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              data-testid={`import-mode-${id}`}
              onClick={() => switchMode(id)}
              className={cn(
                "flex-1 rounded py-1.5 text-xs font-medium transition-colors cursor-pointer",
                mode === id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "curl" ? (
          <>
            <div className="mb-2.5 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              cURL Command
            </div>
            <Textarea
              data-testid="import-curl-textarea"
              size="md"
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
                setError("");
              }}
              placeholder={
                "curl https://api.example.com/users \\\n  -H 'Authorization: Bearer token' \\\n  -d '{\"name\":\"John\"}'"
              }
              spellCheck={false}
            />

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
                <span className={cn("shrink-0 font-mono text-2xs font-semibold", methodClass)}>
                  {preview.method}
                </span>
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {preview.url}
                </span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-2.5 flex items-center justify-between">
              <div className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                Collection JSON
              </div>
              <button
                type="button"
                data-testid="import-postman-upload"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 text-2xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              >
                <Upload className="h-3 w-3" />
                Upload .json file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileChosen(file);
                  e.target.value = "";
                }}
              />
            </div>
            <Textarea
              data-testid="import-postman-textarea"
              size="md"
              value={postmanRaw}
              onChange={(e) => {
                setPostmanRaw(e.target.value);
                setError("");
              }}
              placeholder="Paste an exported Postman collection (Collection v2.1 JSON), or upload the file above"
              spellCheck={false}
            />

            {postmanPreview && !error && (
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
                <span className="truncate text-xs font-medium text-foreground">
                  {postmanPreview.name}
                </span>
                <span className="shrink-0 font-mono text-2xs text-muted-foreground">
                  {postmanPreview.requestCount} request
                  {postmanPreview.requestCount === 1 ? "" : "s"}
                </span>
              </div>
            )}
            {postmanParseFailed && !error && (
              <Alert variant="warning" className="mt-2.5">
                Doesn't look like a Postman collection export yet — keep pasting or check the file.
              </Alert>
            )}
          </>
        )}

        {error && (
          <Alert variant="destructive" role="alert" className="mt-2.5">
            {error}
          </Alert>
        )}
      </div>

      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          data-testid={mode === "curl" ? "import-curl-submit" : "import-postman-submit"}
          onClick={handleImport}
          disabled={mode === "curl" ? !raw.trim() : !postmanRaw.trim()}
        >
          {mode === "curl" ? "Import Request" : "Import Collection"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
