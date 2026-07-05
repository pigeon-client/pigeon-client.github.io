import { Button } from "./button";

/* Shared modal shell — used by ImportModal, EnvModal, KeyboardShortcutsModal. */
export function Modal({
  onClose,
  width = 600,
  position = "center",
  animate = true,
  children,
}: {
  onClose: () => void;
  width?: number;
  position?: "center" | "right";
  animate?: boolean;
  children: React.ReactNode;
}) {
  if (position === "right") {
    return (
      // biome-ignore lint/a11y/useSemanticElements: backdrop div must remain a div so click events propagate to onClick for click-outside-to-close
      <div
        role="button"
        tabIndex={0}
        aria-label="Close modal"
        onClick={onClose}
        onKeyDown={(e) => {
          if (
            e.target === e.currentTarget &&
            (e.key === "Escape" || e.key === "Enter" || e.key === " ")
          ) {
            e.preventDefault();
            onClose();
          }
        }}
        className="fixed inset-0 z-[var(--z-modal)] bg-black/45 backdrop-blur-[4px]"
      >
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              onClose();
            }
          }}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width,
            maxWidth: "90vw",
            animation: animate ? "pgSlideRight 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
          }}
          className="flex flex-col overflow-hidden border-l border-border bg-card shadow-drawer"
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: backdrop div must remain a div so click events propagate to onClick for click-outside-to-close
    <div
      role="button"
      tabIndex={0}
      aria-label="Close modal"
      onClick={onClose}
      onKeyDown={(e) => {
        if (
          e.target === e.currentTarget &&
          (e.key === "Escape" || e.key === "Enter" || e.key === " ")
        ) {
          e.preventDefault();
          onClose();
        }
      }}
      style={{ animation: animate ? "pgFade 120ms ease-out" : "none" }}
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/60 backdrop-blur-[8px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
        style={{
          width,
          maxWidth: "calc(100vw - 48px)",
          animation: animate ? "pgPop 150ms ease-out" : "none",
        }}
        className="flex flex-col overflow-hidden rounded border border-border bg-card shadow-modal"
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-border px-5">
      <span className="text-sm font-semibold text-foreground">{title}</span>
      <Button
        variant="ghost-icon"
        size="icon"
        onClick={onClose}
        className="h-7 w-7 rounded"
        aria-label="Close"
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
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </Button>
    </div>
  );
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-border px-5 py-3.5">
      {children}
    </div>
  );
}
