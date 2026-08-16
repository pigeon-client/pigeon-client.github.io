import { deleteText, insertText, type TextField } from "./inputEdit";

export interface EditSnapshot {
  field: TextField | null;
  copyText: string;
  canCut: boolean;
  canCopy: boolean;
  canPaste: boolean;
  canSelectAll: boolean;
}

export const EMPTY_EDIT_SNAPSHOT: EditSnapshot = {
  field: null,
  copyText: "",
  canCut: false,
  canCopy: false,
  canPaste: false,
  canSelectAll: false,
};

function isTextField(node: EventTarget | null): node is TextField {
  if (node instanceof HTMLTextAreaElement) return true;
  if (!(node instanceof HTMLInputElement)) return false;
  return ["", "text", "search", "url", "password", "email", "tel", "number"].includes(node.type);
}

function closestField(target: EventTarget | null): TextField | null {
  if (isTextField(target)) return target;
  if (!(target instanceof Node)) return null;
  const el = target instanceof Element ? target : target.parentElement;
  const found = el?.closest("input, textarea") ?? null;
  return isTextField(found) ? found : null;
}

function fieldSelection(field: TextField): string {
  const start = field.selectionStart ?? 0;
  const end = field.selectionEnd ?? 0;
  return field.value.slice(start, end);
}

function writable(field: TextField | null): boolean {
  return field != null && !field.disabled && !field.readOnly;
}

/** Short label from the row/control under the pointer — not a whole panel. */
export function labelFromTarget(target: EventTarget | null): string {
  if (!(target instanceof Node)) return "";
  const el = target instanceof Element ? target : target.parentElement;
  if (!el) return "";
  const row = el.closest("button, [role='tab'], a, [data-copy]");
  if (!(row instanceof HTMLElement)) return "";
  if (row.dataset.copy) return row.dataset.copy;
  const text = row.innerText.replace(/\s+/g, " ").trim();
  if (text.length === 0 || text.length > 200) return "";
  return text;
}

export function snapshotEditTarget(target: EventTarget | null): EditSnapshot {
  const field = closestField(target);
  const selected = field ? fieldSelection(field) : (window.getSelection()?.toString() ?? "");
  const copyText = selected || (!field ? labelFromTarget(target) : "");
  const canWrite = writable(field);
  return {
    field,
    copyText,
    canCut: canWrite && selected.length > 0,
    canCopy: copyText.length > 0,
    canPaste: canWrite,
    canSelectAll: field != null && !field.disabled && field.value.length > 0,
  };
}

async function writeClipboard(text: string): Promise<void> {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // WKWebView / permissionless fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

export function runCopy(snap: EditSnapshot): void {
  if (snap.field && fieldSelection(snap.field)) {
    snap.field.focus();
    if (document.execCommand("copy")) return;
  }
  void writeClipboard(snap.copyText);
}

export function runCut(snap: EditSnapshot): void {
  if (!(snap.field && snap.canCut)) return;
  snap.field.focus();
  if (document.execCommand("cut")) return;
  const selected = fieldSelection(snap.field);
  void writeClipboard(selected);
  deleteText(snap.field, "backward");
}

export function runPaste(snap: EditSnapshot): void {
  if (!(snap.field && snap.canPaste)) return;
  snap.field.focus();
  if (document.execCommand("paste")) return;
  void navigator.clipboard.readText().then((text) => {
    if (text && snap.field) insertText(snap.field, text);
  });
}

export function runSelectAll(snap: EditSnapshot): void {
  if (!(snap.field && snap.canSelectAll)) return;
  snap.field.focus();
  snap.field.select();
}
