import { Modal, ModalHeader } from "@/shared/ui/Modal";

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

const SECTIONS: { label: string; shortcuts: { keys: string[]; action: string }[] }[] = [
  {
    label: "Requests",
    shortcuts: [
      { keys: ["⌘", "Enter"], action: "Send request" },
      { keys: ["⌘", "⇧", "N"], action: "New tab" },
      { keys: ["⌘", "⇧", "W"], action: "Close tab" },
      { keys: ["⌘", "⇧", "1–9"], action: "Switch to tab" },
    ],
  },
  {
    label: "Navigation",
    shortcuts: [
      { keys: ["⌘", "⇧", "K"], action: "Open command palette" },
      { keys: ["⌘", "F"], action: "Find in focused panel / sidebar search" },
      { keys: ["⌘", "⇧", "S"], action: "Save to collection" },
      { keys: ["Tab"], action: "Navigate between fields" },
      { keys: ["Esc"], action: "Close modal / blur focus" },
    ],
  },
  {
    label: "Workbenches",
    shortcuts: [
      { keys: ["⌘", "⇧", "M"], action: "Open MCP tab (coming soon)" },
      { keys: ["⌘", "⇧", "G"], action: "Open GraphQL tab (coming soon)" },
    ],
  },
  {
    label: "Other",
    shortcuts: [
      { keys: ["⌘", "⇧", "/"], action: "Show keyboard shortcuts" },
      { keys: ["⌘", "⇧", ","], action: "Open settings" },
      { keys: ["⌘", "⇧", "E"], action: "Open environment manager" },
    ],
  },
];

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-[26px] select-none items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-2xs font-semibold text-foreground">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  return (
    <Modal onClose={onClose} width={480}>
      <ModalHeader title="Keyboard Shortcuts" onClose={onClose} />

      <div className="max-h-[calc(80vh-64px)] space-y-6 overflow-y-auto p-5">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <div className="mb-3 text-2xs font-bold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </div>
            <div className="space-y-0">
              {section.shortcuts.map(({ keys, action }) => (
                <div
                  key={action}
                  className="flex items-center justify-between border-b border-border py-2.5"
                >
                  <span className="text-code text-muted-foreground">{action}</span>
                  <div className="flex items-center gap-1">
                    {keys.map((key, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: keys array is a fixed ordered tuple per shortcut entry
                      <span key={`${action}-${key}-${i}`} className="flex items-center gap-1">
                        {i > 0 && (
                          <span className="text-2xs font-semibold text-muted-foreground">+</span>
                        )}
                        <Key>{key}</Key>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
