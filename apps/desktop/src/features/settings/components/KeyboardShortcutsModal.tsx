import { Kbd, Modal, ModalHeader } from "@pigeon/ui";

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

const SECTIONS: { label: string; shortcuts: { keys: string[]; action: string }[] }[] = [
  {
    label: "Requests",
    shortcuts: [
      { keys: ["⌘", "Enter"], action: "Send request" },
      { keys: ["⌘", "T"], action: "New tab" },
      { keys: ["⌘", "W"], action: "Close tab" },
      { keys: ["⌘", "1–9"], action: "Switch to tab" },
      { keys: ["⌘", "S"], action: "Save (update if already in collection)" },
      { keys: ["⌘", "⇧", "S"], action: "Save as… to collection" },
      { keys: ["⌘", "L"], action: "Focus URL bar" },
    ],
  },
  {
    label: "Navigation",
    shortcuts: [
      { keys: ["⌘", "K"], action: "Open command palette" },
      { keys: ["⌘", "F"], action: "Focus header search / find in panel" },
      { keys: ["⌘", "\\"], action: "Toggle sidebar" },
      { keys: ["Tab"], action: "Navigate between fields" },
      { keys: ["Esc"], action: "Close modal / blur focus" },
    ],
  },
  {
    label: "Workbenches",
    shortcuts: [
      { keys: ["⌘", "⇧", "R"], action: "REST workbench" },
      { keys: ["⌘", "⇧", "M"], action: "MCP (coming soon)" },
      { keys: ["⌘", "⇧", "G"], action: "GraphQL (coming soon)" },
    ],
  },
  {
    label: "Other",
    shortcuts: [
      { keys: ["⌘", "⇧", "/"], action: "Show keyboard shortcuts" },
      { keys: ["⌘", ","], action: "Open settings" },
      { keys: ["⌘", "⇧", "E"], action: "Open environment manager" },
    ],
  },
];

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
                        <Kbd className="h-6 min-w-[26px] select-none">{key}</Kbd>
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
