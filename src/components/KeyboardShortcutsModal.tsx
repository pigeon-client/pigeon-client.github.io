import { X } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

const shortcuts = [
  { keys: ['⌘', 'Enter'], action: 'Send request' },
  { keys: ['⌘', 'N'], action: 'New tab/request' },
  { keys: ['⌘', 'W'], action: 'Close current tab' },
  { keys: ['⌘', '⇧', '1-9'], action: 'Switch to tab' },
  { keys: ['⌘', 'F'], action: 'Focus sidebar search' },
  { keys: ['⌘', 'S'], action: 'Save to collection' },
  { keys: ['Tab'], action: 'Navigate between fields' },
  { keys: ['Esc'], action: 'Close modals / blur focused element' },
  { keys: ['?'], action: 'Show this reference' },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 text-[11px] font-mono bg-bg-hover text-text-primary border border-border-primary rounded min-w-[24px] text-center">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  return (
    <div className="backdrop" onClick={onClose}>
      <div
        className="modal-card w-[480px] max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 className="text-sm font-semibold text-text-primary">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        {/* Shortcuts list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
          {shortcuts.map(({ keys, action }) => (
            <div
              key={action}
              className="flex items-center justify-between py-2.5 border-b border-border-primary/50 last:border-0"
            >
              <span className="text-xs text-text-secondary">{action}</span>
              <div className="flex items-center gap-1">
                {keys.map((key, i) => (
                  <span key={i} className="flex items-center gap-0.5">
                    {i > 0 && <span className="text-text-tertiary text-xs mx-0.5">+</span>}
                    <Kbd>{key}</Kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
