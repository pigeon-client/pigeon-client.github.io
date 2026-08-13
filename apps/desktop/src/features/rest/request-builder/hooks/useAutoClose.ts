import { type RefObject, useCallback } from "react";
import { deleteText, insertText, type TextField } from "@/shared/lib/inputEdit";
import { shouldExpandJsonBlock } from "@/shared/lib/jsonEditContext";

const pairs: Record<string, string> = {
  "{": "}",
  "[": "]",
  "(": ")",
  '"': '"',
  "'": "'",
  "`": "`",
};

const openChars = new Set(Object.keys(pairs));
const closeChars = new Set(Object.values(pairs));

const EMPTY_JSON_BLOCK = /^\{\n(\s+)\n\}$/;

/** If only whitespace lies before the next `close` char, return the caret after it. */
export function skipOverClosingChar(
  value: string,
  start: number,
  end: number,
  close: string,
): number | null {
  if (start !== end) return null;
  let i = start;
  while (i < value.length && /\s/.test(value[i])) i++;
  if (i < value.length && value[i] === close) return i + 1;
  return null;
}

export function useAutoClose(
  ref: RefObject<TextField | null>,
  options?: { disabled?: ReadonlySet<string>; jsonBlockExpand?: boolean; indent?: number },
) {
  const disabled = options?.disabled;
  const jsonBlockExpand = options?.jsonBlockExpand;
  const indent = " ".repeat(options?.indent ?? 2);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent): boolean => {
      const el = ref.current;
      if (!el) return false;

      const { selectionStart, selectionEnd, value } = el;
      const char = e.key;
      const start = selectionStart ?? 0;

      if (char === "{" && jsonBlockExpand && !disabled?.has("{")) {
        if (shouldExpandJsonBlock(value, start)) {
          e.preventDefault();
          insertText(el, `{\n${indent}\n}`);
          el.selectionStart = el.selectionEnd = start + 1 + indent.length;
          return true;
        }
      }

      if (openChars.has(char) && !disabled?.has(char)) {
        e.preventDefault();
        const pair = pairs[char];
        insertText(el, char + pair);
        el.selectionStart = el.selectionEnd = start + 1;
        return true;
      }

      if (closeChars.has(char)) {
        const openForClose = Object.entries(pairs).find(([, close]) => close === char)?.[0];
        if (!(openForClose && disabled?.has(openForClose))) {
          if (selectionStart !== null && selectionEnd !== null) {
            const skipTo = skipOverClosingChar(value, selectionStart, selectionEnd, char);
            if (skipTo !== null) {
              e.preventDefault();
              el.selectionStart = el.selectionEnd = skipTo;
              return true;
            }
          }
        }
      }

      if (char === "Backspace") {
        if (selectionStart !== null && selectionStart === selectionEnd) {
          if (
            jsonBlockExpand &&
            EMPTY_JSON_BLOCK.test(value) &&
            start > 0 &&
            start < value.length - 1
          ) {
            e.preventDefault();
            el.setSelectionRange(0, value.length);
            deleteText(el, "backward");
            return true;
          }

          if (selectionStart > 0) {
            const prev = value[selectionStart - 1];
            const next = value[selectionStart];
            if (openChars.has(prev) && !disabled?.has(prev) && pairs[prev] === next) {
              e.preventDefault();
              el.setSelectionRange(selectionStart - 1, selectionStart + 1);
              deleteText(el, "backward");
              return true;
            }
          }
        }
      }

      return false;
    },
    [ref, disabled, jsonBlockExpand, indent],
  );

  return { handleKeyDown };
}
