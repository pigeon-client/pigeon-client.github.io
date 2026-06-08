import { useCallback, RefObject } from 'react';

const pairs: Record<string, string> = {
  '{': '}',
  '[': ']',
  '(': ')',
  '"': '"',
  "'": "'",
  '`': '`',
};

const openChars = new Set(Object.keys(pairs));
const closeChars = new Set(Object.values(pairs));

export function useAutoClose(ref: RefObject<HTMLTextAreaElement | null>) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
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
      el.value = newValue;
      el.selectionStart = el.selectionEnd = selectionStart + 1;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    if (closeChars.has(char)) {
      if (selectionStart < value.length && value[selectionStart] === char && selectionStart === selectionEnd) {
        e.preventDefault();
        el.selectionStart = el.selectionEnd = selectionStart + 1;
        return;
      }
    }

    if (char === 'Backspace') {
      if (selectionStart > 0 && selectionStart === selectionEnd) {
        const prev = value[selectionStart - 1];
        const next = value[selectionStart];
        if (openChars.has(prev) && pairs[prev] === next) {
          e.preventDefault();
          const newValue = value.slice(0, selectionStart - 1) + value.slice(selectionStart + 1);
          el.value = newValue;
          el.selectionStart = el.selectionEnd = selectionStart - 1;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          return;
        }
      }
    }
  }, [ref]);

  return { handleKeyDown };
}
