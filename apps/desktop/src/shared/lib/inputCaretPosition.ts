import { type RefObject, useEffect, useState } from "react";

const MENU_WIDTH = 240;

/** Viewport anchor for a popover below the caret in a text input. */
export function getInputCaretViewport(input: HTMLInputElement, caret: number) {
  const style = getComputedStyle(input);
  const rect = input.getBoundingClientRect();
  const padL = Number.parseFloat(style.paddingLeft) || 0;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { top: rect.bottom + 4, left: rect.left + padL };
  }

  ctx.font = style.font;
  const width = ctx.measureText(input.value.slice(0, caret)).width;
  const left = rect.left + padL + width - input.scrollLeft;
  const maxLeft = Math.max(8, window.innerWidth - MENU_WIDTH - 8);

  return {
    top: rect.bottom + 4,
    left: Math.min(Math.max(8, left), maxLeft),
  };
}

/** Keep a fixed-position autocomplete menu anchored to the input caret. */
export function useInputCaretAnchor(
  inputRef: RefObject<HTMLInputElement | null>,
  caret: number,
  enabled: boolean,
  value: string,
) {
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!enabled) {
      setAnchor(null);
      return;
    }

    const input = inputRef.current;
    if (!input) return;

    const update = () => {
      setAnchor(getInputCaretViewport(input, caret));
    };

    update();
    input.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      input.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [caret, enabled, inputRef, value]);

  return anchor;
}
