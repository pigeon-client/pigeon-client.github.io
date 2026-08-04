import { cn } from "@/shared/lib/utils";

interface TokenInfo {
  name: string;
  value: string | null;
  random: boolean;
}

/* ── Below the URL row: cURL-import toast, unresolved-var error, hovered-token
 *  preview, and the resolved-URL preview — mutually exclusive, in that order. ── */
export function UrlBarStatusLine({
  curlToast,
  sendError,
  hoveredToken,
  url,
  previewUrl,
}: {
  curlToast: boolean;
  sendError: string | null;
  hoveredToken: TokenInfo | null;
  url: string;
  previewUrl: string;
}) {
  if (curlToast) {
    return (
      <div
        style={{ animation: "pgToast 150ms ease-out" }}
        className="mt-1.5 flex items-center gap-2 rounded border border-status-2xx/30 bg-status-2xx/10 px-3 py-1"
      >
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
        <span className="text-xs font-medium text-status-2xx">
          cURL imported — method, headers and body applied
        </span>
      </div>
    );
  }

  if (sendError) {
    return (
      <div
        data-testid="send-error"
        style={{ animation: "pgToast 150ms ease-out" }}
        className="mt-1.5 flex items-center gap-2 rounded border border-destructive/30 bg-destructive/10 px-3 py-1"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="text-destructive"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span className="text-xs font-medium text-destructive">{sendError}</span>
      </div>
    );
  }

  // Only a URL with `{{tokens}}` can ever show a hover preview or a resolved
  // preview below it — reserve the row's height for that case only, so a
  // plain URL (the common case) keeps zero extra space. Reserving it once
  // the URL has tokens (rather than only while actively hovering) stops the
  // layout from jumping as the mouse moves between adjacent token chips.
  if (!/\{\{[^}]*\}\}/.test(url)) return null;

  return (
    <div className="ml-0.5 mt-1 flex min-h-[21px] items-center gap-1.5 truncate text-2xs">
      {hoveredToken ? (
        <>
          <span className="font-mono text-[color:var(--var-token)]">{`{{${hoveredToken.name}}}`}</span>
          <span className="text-muted-foreground">→</span>
          {hoveredToken.value === null ? (
            <span className="text-destructive">unresolved</span>
          ) : (
            <span
              className={cn(
                "truncate font-mono",
                hoveredToken.random ? "text-muted-foreground italic" : "text-foreground",
              )}
            >
              {hoveredToken.value}
            </span>
          )}
        </>
      ) : (
        previewUrl !== url && <span className="truncate text-muted-foreground">{previewUrl}</span>
      )}
    </div>
  );
}
