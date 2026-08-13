/** Text fields whose edits should participate in the browser undo stack. */
export type TextField = HTMLInputElement | HTMLTextAreaElement;

function dispatchInput(field: TextField, inputType: string, data?: string) {
  field.dispatchEvent(
    new InputEvent("input", { bubbles: true, cancelable: true, inputType, data: data ?? null }),
  );
}

/** Insert text at the current selection using the browser undo stack when available. */
export function insertText(field: TextField, text: string): void {
  field.focus();
  if (
    typeof document.execCommand === "function" &&
    document.execCommand("insertText", false, text)
  ) {
    return;
  }

  const start = field.selectionStart ?? field.value.length;
  const end = field.selectionEnd ?? start;
  field.setRangeText(text, start, end, "end");
  dispatchInput(field, "insertText", text);
}

/** Delete the current selection, or one character in the given direction. */
export function deleteText(field: TextField, direction: "backward" | "forward" = "backward"): void {
  field.focus();
  if (
    typeof document.execCommand === "function" &&
    document.execCommand("delete", false, direction)
  ) {
    return;
  }

  const start = field.selectionStart ?? 0;
  const end = field.selectionEnd ?? start;
  if (start !== end) {
    field.setRangeText("", start, end, "start");
    dispatchInput(field, "deleteContentBackward");
    return;
  }

  if (direction === "backward" && start > 0) {
    field.setRangeText("", start - 1, start, "start");
    dispatchInput(field, "deleteContentBackward");
    return;
  }

  if (direction === "forward" && end < field.value.length) {
    field.setRangeText("", end, end + 1, "start");
    dispatchInput(field, "deleteContentForward");
  }
}

/** Replace a character range, preserving undo when the browser supports it. */
export function replaceRange(field: TextField, start: number, end: number, text: string): void {
  field.focus();
  field.setSelectionRange(start, end);
  insertText(field, text);
}
