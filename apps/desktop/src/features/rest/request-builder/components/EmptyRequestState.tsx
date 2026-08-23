import pigeonLogo from "@pigeon/brand/pigeon-mark.svg";
import { Button, Kbd } from "@pigeon/ui";
import { useState } from "react";
import { loadSampleRequest } from "../lib/firstRequest";

const HINTS = [
  { keys: ["⌘", "⇧", "N"], label: "New tab" },
  { keys: ["⌘", "Enter"], label: "Send request" },
  { keys: ["⌘", "F"], label: "Find / search" },
  { keys: ["⌘", "⇧", ","], label: "Settings" },
] as const;

export function EmptyRequestState() {
  const [loading, setLoading] = useState(false);

  const loadSample = () => {
    setLoading(true);
    void loadSampleRequest().finally(() => setLoading(false));
  };

  return (
    <div
      data-testid="empty-request-state"
      className="flex flex-1 select-none flex-col items-center justify-center bg-background px-6"
    >
      <img
        src={pigeonLogo}
        alt=""
        aria-hidden="true"
        className="pg-logo mb-3 h-[72px] w-[72px] object-contain"
      />
      <div className="mb-2 text-sm font-semibold tracking-tight text-foreground">
        No request open
      </div>
      <div className="mb-8 max-w-[280px] text-center text-code leading-relaxed text-muted-foreground">
        Type a URL above, or load a sample to see how it works.
      </div>

      <div className="mb-10">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={loadSample}
          disabled={loading}
          data-testid="empty-try-example"
          className="gap-2"
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
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          Load a sample
        </Button>
      </div>

      <div className="flex flex-col gap-1.5 rounded border border-border bg-card px-6 py-4">
        {HINTS.map(({ keys, label }) => (
          <div key={label} className="flex items-center justify-between gap-6">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div className="flex gap-1">
              {keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
