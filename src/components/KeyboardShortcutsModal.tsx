import { Modal, ModalHeader } from "./ImportModal";

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

const SECTIONS: { label: string; shortcuts: { keys: string[]; action: string }[] }[] = [
  {
    label: "Requests",
    shortcuts: [
      { keys: ["⌘", "Enter"], action: "Send request" },
      { keys: ["⌘", "N"], action: "New tab" },
      { keys: ["⌘", "W"], action: "Close tab" },
      { keys: ["⌘", "⇧", "1–9"], action: "Switch to tab" },
    ],
  },
  {
    label: "Navigation",
    shortcuts: [
      { keys: ["⌘", "F"], action: "Focus sidebar search" },
      { keys: ["⌘", "S"], action: "Save to collection" },
      { keys: ["Tab"], action: "Navigate between fields" },
      { keys: ["Esc"], action: "Close modal / blur focus" },
    ],
  },
  {
    label: "Other",
    shortcuts: [
      { keys: ["?"], action: "Show keyboard shortcuts" },
      { keys: ["⌘", ","], action: "Open settings" },
      { keys: ["⌘", "⇧", "E"], action: "Open environment manager" },
    ],
  },
];

function Key({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 26,
        height: 24,
        padding: "0 6px",
        background: "var(--bg-input)",
        border: "1px solid var(--border)",
        borderRadius: 5,
        fontFamily: "var(--font-mono)",
        fontSize: 11.5,
        color: "var(--text-primary)",
        fontWeight: 600,
        userSelect: "none",
        boxShadow: "0 1px 0 var(--border)",
      }}
    >
      {children}
    </span>
  );
}

export function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  return (
    <Modal onClose={onClose} width={480}>
      <ModalHeader title="Keyboard Shortcuts" onClose={onClose} />

      <div style={{ padding: "20px 24px", overflowY: "auto", maxHeight: "calc(80vh - 64px)" }}>
        {SECTIONS.map((section) => (
          <div key={section.label} style={{ marginBottom: 24 }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 12,
              }}
            >
              {section.label}
            </div>
            {section.shortcuts.map(({ keys, action }) => (
              <div
                key={action}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{action}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {keys.map((key, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: Keys within a shortcut are unique list items
                    <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {i > 0 && (
                        <span
                          style={{
                            color: "var(--text-placeholder)",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          +
                        </span>
                      )}
                      <Key>{key}</Key>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  );
}
