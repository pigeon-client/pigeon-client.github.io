import { Button, Input, Label, Modal, ModalFooter, ModalHeader } from "@pigeon/ui";
import { useEffect, useRef, useState } from "react";

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
        <Label htmlFor="collection-name-modal-input" variant="field">
          {state.label}
        </Label>
        <Input
          id="collection-name-modal-input"
          ref={inputRef}
          size="lg"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") onClose();
          }}
          placeholder={state.placeholder}
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
