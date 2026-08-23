import { useLayoutEffect, useState } from "react";

const PAD = 8;

function queryVisible(selector: string): HTMLElement | null {
  return (
    [...document.querySelectorAll<HTMLElement>(selector)].find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) ?? null
  );
}

/** Track a live control so the hole can appear after a step change mounts it. */
export function useTargetRect(selector: string): DOMRect | null {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    let ro: ResizeObserver | null = null;
    let observed: HTMLElement | null = null;
    let raf = 0;
    let stopped = false;
    const started = performance.now();

    const update = () => {
      if (stopped) return;
      const el = queryVisible(selector);
      setRect(el ? el.getBoundingClientRect() : null);
      if (el && el !== observed) {
        ro?.disconnect();
        ro = new ResizeObserver(update);
        ro.observe(el);
        observed = el;
      }
    };

    const tick = () => {
      update();
      if (stopped) return;
      if (!queryVisible(selector) && performance.now() - started < 2500) {
        raf = requestAnimationFrame(tick);
      }
    };

    update();
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [selector]);

  return rect;
}

/** Four scrim panes around a hole so the highlighted control stays clickable. */
export function OnboardingSpotlight({ rect }: { rect: DOMRect | null }) {
  if (!rect) {
    return <div className="fixed inset-0 z-modal bg-scrim" />;
  }

  const t = Math.max(0, rect.top - PAD);
  const l = Math.max(0, rect.left - PAD);
  const w = rect.width + PAD * 2;
  const h = rect.height + PAD * 2;

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-modal bg-scrim" style={{ height: t }} />
      <div className="fixed left-0 z-modal bg-scrim" style={{ top: t, width: l, height: h }} />
      <div
        className="fixed z-modal bg-scrim"
        style={{ top: t, left: l + w, right: 0, height: h }}
      />
      <div className="fixed inset-x-0 bottom-0 z-modal bg-scrim" style={{ top: t + h }} />
      <div
        className="pointer-events-none fixed z-modal rounded-md ring-2 ring-primary"
        style={{ top: t, left: l, width: w, height: h }}
      />
    </>
  );
}

export function coachCardStyle(rect: DOMRect | null): { top: number; left: number } {
  const cardW = 340;
  if (!rect) {
    return {
      top: Math.round(window.innerHeight / 2 - 80),
      left: Math.round(window.innerWidth / 2 - cardW / 2),
    };
  }
  const top = Math.min(rect.bottom + PAD + 12, window.innerHeight - 200);
  const left = Math.min(Math.max(16, rect.left), window.innerWidth - cardW - 16);
  return { top, left };
}
