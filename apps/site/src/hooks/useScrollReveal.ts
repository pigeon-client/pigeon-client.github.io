import { useEffect } from "react";

/**
 * Reveals any `.reveal` element as it scrolls into view. Mount once at the app
 * root — a single IntersectionObserver watches every current and future
 * `.reveal` node. Stagger with `style={{ "--d": "0.1s" }}` on the element.
 */
export function useScrollReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      for (const el of document.querySelectorAll(".reveal")) el.classList.add("visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            obs.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    const seen = new WeakSet<Element>();
    const scan = () => {
      for (const el of document.querySelectorAll(".reveal:not(.visible)")) {
        if (!seen.has(el)) {
          seen.add(el);
          observer.observe(el);
        }
      }
    };
    scan();

    // Catch anything mounted a tick later.
    const raf = requestAnimationFrame(scan);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);
}
