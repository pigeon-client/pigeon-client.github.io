import { type RefObject, useCallback } from "react";

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

/**
 * Write a new value through React's native setter so the controlled
 * `onChange` fires. A plain `el.value = …` assignment is swallowed by
 * React 19's value tracker and never reaches state.
 */
const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;

function setValue(el: HTMLTextAreaElement, value: string) {
  nativeSetter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

export function useAutoClose(ref: RefObject<HTMLTextAreaElement | null>) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const el = ref.current;
      if (!el) return;

      const { selectionStart, selectionEnd, value } = el;
      const char = e.key;

      if (openChars.has(char)) {
        e.preventDefault();
        const pair = pairs[char];
        const before = value.slice(0, selectionStart);
        const after = value.slice(selectionEnd);

        const newValue = before + char + pair + after;
        setValue(el, newValue);
        el.selectionStart = el.selectionEnd = selectionStart + 1;
        return;
      }

      if (closeChars.has(char)) {
        if (
          selectionStart < value.length &&
          value[selectionStart] === char &&
          selectionStart === selectionEnd
        ) {
          e.preventDefault();
          el.selectionStart = el.selectionEnd = selectionStart + 1;
          return;
        }
      }

      if (char === "Backspace") {
        if (selectionStart > 0 && selectionStart === selectionEnd) {
          const prev = value[selectionStart - 1];
          const next = value[selectionStart];
          if (openChars.has(prev) && pairs[prev] === next) {
            e.preventDefault();
            const newValue = value.slice(0, selectionStart - 1) + value.slice(selectionStart + 1);
            setValue(el, newValue);
            el.selectionStart = el.selectionEnd = selectionStart - 1;
            return;
          }
        }
      }
    },
    [ref],
  );

  return { handleKeyDown };
}
