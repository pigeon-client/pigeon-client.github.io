/* ── Below the URL row: unresolved-var error and the resolved-URL preview
 *  when the URL contains {{tokens}}. ── */
export function UrlBarStatusLine({
  sendError,
  url,
  previewUrl,
}: {
  sendError: string | null;
  url: string;
  previewUrl: string;
}) {
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

  if (!/\{\{[^}]*\}\}/.test(url) || previewUrl === url) return null;

  return (
    <div className="ml-0.5 mt-1 flex min-h-[21px] items-center gap-1.5 truncate text-2xs">
      <span className="truncate text-muted-foreground">{previewUrl}</span>
    </div>
  );
}
