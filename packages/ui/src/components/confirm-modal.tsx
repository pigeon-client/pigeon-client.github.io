import { Button } from "./button";
import { Modal, ModalFooter, ModalHeader } from "./modal";

export interface ConfirmModalState {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}

/**
 * Custom confirm dialog — replaces window.confirm(), which some Tauri webviews
 * (notably WebKitGTK on Linux) silently no-op instead of prompting.
 */
export function ConfirmModal({
  state,
  onClose,
}: {
  state: ConfirmModalState;
  onClose: () => void;
}) {
  const commit = () => {
    state.onConfirm();
    onClose();
  };

  return (
    <Modal onClose={onClose} width={400}>
      <ModalHeader title={state.title} onClose={onClose} />
      <div className="px-5 py-5 text-xs text-foreground">{state.message}</div>
      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant={state.danger ? "danger-filled" : "primary"}
          size="sm"
          data-testid="confirm-modal-confirm"
          onClick={commit}
        >
          {state.confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
