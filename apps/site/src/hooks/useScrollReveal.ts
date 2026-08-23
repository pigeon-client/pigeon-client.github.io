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
      // Extra bottom margin so the last sections still reveal when hash-jumped.
      { threshold: 0.01, rootMargin: "80px 0px 30% 0px" },
    );

    const scan = () => {
      for (const el of document.querySelectorAll(".reveal:not(.visible)")) {
        observer.observe(el);
      }
    };
    scan();

    const raf = requestAnimationFrame(scan);
    // Re-scan after layout settles (fonts, images, late mounts).
    const t = window.setTimeout(scan, 400);
    // Hydrated islands can rewrite className and drop `.visible` — watch for that.
    const mo = new MutationObserver(scan);
    mo.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
      mo.disconnect();
      observer.disconnect();
    };
  }, []);
}
