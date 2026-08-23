import { Button, Separator, TabButton } from "@pigeon/ui";
import { Clock, Copy, Download, Hexagon, WrapText } from "lucide-react";
import { relativeTime } from "@/shared/lib/time";
import type { BodyViewMode } from "./types";

function formatStatusHeader(status: number, statusText: string): { label: string; title?: string } {
  const raw = statusText.trim();
  if (!raw) return { label: status === 0 ? "Request failed" : "Unknown" };

  if (status === 0) {
    if (raw === "Cancelled") return { label: "Cancelled" };
    const withoutUrl = raw.replace(/\s*\((?:https?:\/\/|ipc:)[^)]+\)\s*$/i, "").trim();
    const label =
      withoutUrl.length > 48
        ? `${withoutUrl.slice(0, 45).trimEnd()}…`
        : withoutUrl || "Request failed";
    return label === raw ? { label } : { label, title: raw };
  }

  if (raw.length > 40) return { label: `${raw.slice(0, 37).trimEnd()}…`, title: raw };
  return { label: raw };
}

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
    bodyEvicted?: boolean;
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
  const { label: statusLabel, title: statusTitle } = formatStatusHeader(
    response.status,
    response.statusText,
  );
  const sizeLabel =
    responseSize < 1024 ? `${responseSize} B` : `${(responseSize / 1024).toFixed(1)} KB`;

  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-4">
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}99` }}
        />
        <span
          data-testid="response-status"
          title={statusTitle}
          className="max-w-[min(40vw,20rem)] truncate font-mono text-code font-semibold"
          style={{ color: statusColor }}
        >
          {response.status} {statusLabel}
        </span>
      </div>

      <Separator orientation="vertical" className="h-5" />

      <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
        <div className="flex items-center gap-1.5">
          {response.snapshotTimestamp !== undefined ? (
            <span data-testid="response-snapshot-label" className="font-mono text-code">
              snapshot · {relativeTime(response.snapshotTimestamp)}
              {response.snapshotTruncated ? " · truncated" : ""}
            </span>
          ) : (
            <>
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="font-mono text-code">{response.responseTime} ms</span>
            </>
          )}
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-1.5">
          <Hexagon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="font-mono text-code">
            {sizeLabel}
            {response.truncated ? " · truncated" : ""}
            {response.bodyEvicted ? " · resend to view body" : ""}
          </span>
        </div>
      </div>

      <div className="min-w-2 flex-1" />

      <div className="flex shrink-0 items-center gap-1">
        <TabButton active={activeTab === "body"} onClick={() => setActiveTab("body")}>
          Body
        </TabButton>
        <TabButton active={activeTab === "headers"} onClick={() => setActiveTab("headers")}>
          Headers
          {Object.keys(response.headers).length > 0 && (
            <span className="ml-0.5 text-2xs font-semibold text-muted-foreground">
              {Object.keys(response.headers).length}
            </span>
          )}
        </TabButton>
        <Separator orientation="vertical" className="mx-1 h-5" />
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
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDownload} title="Download response">
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
