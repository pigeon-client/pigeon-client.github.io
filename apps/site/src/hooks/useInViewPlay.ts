import { type RefObject, useEffect, useState } from "react";

/**
 * True while `sectionRef` intersects the viewport.
 * Used to gate feature/organize story animations.
 * Honors prefers-reduced-motion (always false → CSS shows static finals).
 */
export function useInViewPlay(sectionRef: RefObject<HTMLElement | null>) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const io = new IntersectionObserver(([entry]) => setPlaying(entry.isIntersecting), {
      threshold: 0.15,
    });
    io.observe(section);
    return () => io.disconnect();
  }, [sectionRef]);

  return playing;
}
