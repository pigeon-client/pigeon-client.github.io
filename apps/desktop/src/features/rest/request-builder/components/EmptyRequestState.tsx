import pigeonLogo from "@pigeon/brand/pigeon-mark.svg";
import { Button, Kbd } from "@pigeon/ui";
import { parseCurl } from "../../import-export/services/curlService";
import { useTabStore } from "../store";

/* A ready-to-run sample so the app is never a blank slate. */
const EXAMPLE_CURL =
  'curl https://jsonplaceholder.typicode.com/todos/1 -H "Accept: application/json"';

export function EmptyRequestState() {
  const addTab = useTabStore((s) => s.addTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const updateTabRequest = useTabStore((s) => s.updateTabRequest);

  const loadExample = () => {
    const parsed = parseCurl(EXAMPLE_CURL);
    const id = addTab();
    if (parsed) updateTabRequest(id, parsed);
    setActiveTab(id);
  };

  const hints = [
    { keys: ["⌘", "⇧", "N"], label: "New tab" },
    { keys: ["⌘", "Enter"], label: "Send request" },
    { keys: ["⌘", "F"], label: "Find / search" },
    { keys: ["⌘", "⇧", ","], label: "Settings" },
  ];

  return (
    <div className="flex flex-1 select-none flex-col items-center justify-center bg-background">
      <img
        src={pigeonLogo}
        alt="Pigeon"
        className="pg-logo mb-5 h-[72px] w-[72px] object-contain"
      />

      <div className="mb-2 text-lg font-bold tracking-tight text-foreground">No request open</div>
      <div className="mb-8 max-w-[280px] text-center text-code leading-relaxed text-muted-foreground">
        Start from scratch, or try a ready-made sample request to see how it works.
      </div>

      <div className="mb-10">
        <Button type="button" variant="outline" size="lg" onClick={loadExample} className="gap-2">
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
          Try an example
        </Button>
      </div>

      <div className="flex flex-col gap-1.5 rounded border border-border bg-card px-6 py-4">
        {hints.map(({ keys, label }) => (
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
