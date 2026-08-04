import { Button } from "@pigeon/ui";
import { WrapText } from "lucide-react";
import { relativeTime } from "@/shared/lib/time";
import { Tab } from "@/shared/ui/tabs-shim";
import type { BodyViewMode } from "./types";

/* ── Status bar (status/time/size, Body/Headers tabs, view-mode + actions) ── */
export function StatusLine({
  response,
  statusColor,
  responseSize,
  activeTab,
  setActiveTab,
  isSse,
  showText,
  viewModes,
  effectiveView,
  setBodyView,
  wordWrap,
  setWordWrap,
  onCopyCurl,
  onDownload,
}: {
  response: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    truncated?: boolean;
    snapshotTimestamp?: number;
    snapshotTruncated?: boolean;
    responseTime: number;
  };
  statusColor: string;
  responseSize: number;
  activeTab: "body" | "headers";
  setActiveTab: (tab: "body" | "headers") => void;
  isSse: boolean;
  showText: boolean;
  viewModes: { val: BodyViewMode; label: string }[];
  effectiveView: BodyViewMode;
  setBodyView: (v: BodyViewMode) => void;
  wordWrap: boolean;
  setWordWrap: (v: boolean) => void;
  onCopyCurl: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="flex h-11 flex-shrink-0 items-center gap-3 border-b border-border px-4">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}99` }}
        />
        <span
          data-testid="response-status"
          className="font-mono text-code font-semibold"
          style={{ color: statusColor }}
        >
          {response.status} {response.statusText}
        </span>
      </div>
      <div className="h-4 w-px bg-border" />
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {response.snapshotTimestamp !== undefined ? (
          <span data-testid="response-snapshot-label" className="font-mono text-code">
            snapshot · {relativeTime(response.snapshotTimestamp)}
            {response.snapshotTruncated ? " · truncated" : ""}
          </span>
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
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="font-mono text-code">{response.responseTime} ms</span>
          </>
        )}
      </div>
      <span style={{ width: 1, height: 16, background: "var(--border)", margin: "0 16px" }} />
      <div
        style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}
      >
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
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-code)" }}>
          {responseSize < 1024 ? `${responseSize} B` : `${(responseSize / 1024).toFixed(1)} KB`}
          {response.truncated ? " · truncated" : ""}
        </span>
      </div>
      <div style={{ flex: 1 }} />
      <Tab active={activeTab === "body"} onClick={() => setActiveTab("body")}>
        Body
      </Tab>
      <Tab active={activeTab === "headers"} onClick={() => setActiveTab("headers")}>
        Headers
        {Object.keys(response.headers).length > 0 && (
          <span className="ml-0.5 text-2xs font-semibold text-muted-foreground">
            {Object.keys(response.headers).length}
          </span>
        )}
      </Tab>
      <div className="mx-2 h-4 w-px bg-border" />
      {!isSse && showText && (
        <div className="flex rounded border border-border bg-card p-0.5">
          {viewModes.map(({ val, label }) => (
            <button
              type="button"
              key={label}
              data-testid={`response-view-${val}`}
              onClick={() => setBodyView(val)}
              className={`h-6 cursor-pointer rounded px-3 text-xs transition-all ${
                effectiveView === val
                  ? "bg-accent font-semibold text-foreground"
                  : "font-medium text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {!isSse && showText && effectiveView !== "preview" && (
        <Button
          variant="ghost"
          size="icon"
          data-testid="response-wrap-toggle"
          onClick={() => setWordWrap(!wordWrap)}
          aria-pressed={wordWrap}
          title={wordWrap ? "Word wrap: on" : "Word wrap: off"}
          className={wordWrap ? "text-primary" : undefined}
        >
          <WrapText className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button variant="ghost" size="icon" onClick={onCopyCurl} title="Copy as cURL">
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
      </Button>
      <Button variant="ghost" size="icon" onClick={onDownload} title="Download response">
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
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </Button>
    </div>
  );
}
