import { Button } from "@pigeon/ui";
import { useEffect, useRef, useState } from "react";
import { Modal, ModalFooter, ModalHeader } from "@/shared/ui/Modal";

export interface NameModalState {
  title: string;
  label: string;
  placeholder: string;
  confirmLabel: string;
  initialValue?: string;
  onSubmit: (name: string) => void;
}

export function NameModal({ state, onClose }: { state: NameModalState; onClose: () => void }) {
  const [draft, setDraft] = useState(state.initialValue ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    state.onSubmit(trimmed);
    onClose();
  };

  return (
    <Modal onClose={onClose} width={420} animate={state.title !== "Create Collection"}>
      <ModalHeader title={state.title} onClose={onClose} />
      <div className="px-5 py-5">
        <label
          htmlFor="collection-name-modal-input"
          className="mb-2 block text-2xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {state.label}
        </label>
        <input
          id="collection-name-modal-input"
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") onClose();
          }}
          placeholder={state.placeholder}
          className="h-9 w-full rounded border border-border bg-card px-3 font-mono text-xs text-foreground outline-none focus:border-primary"
        />
      </div>
      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={commit} disabled={!draft.trim()}>
          {state.confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
