import { useEffect } from "react";

/** Adds a copy button to every `<pre>` inside `.blog-prose`. */
export function BlogCodeCopy() {
  useEffect(() => {
    const root = document.querySelector(".blog-prose");
    if (!root) return;

    const timers = new Map<HTMLButtonElement, number>();

    for (const pre of root.querySelectorAll("pre")) {
      if (!(pre instanceof HTMLPreElement)) continue;
      if (pre.closest(".blog-code")) continue;

      const wrap = document.createElement("div");
      wrap.className = "blog-code";
      pre.parentNode?.insertBefore(wrap, pre);
      wrap.appendChild(pre);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "blog-code-copy";
      btn.textContent = "copy";
      btn.setAttribute("aria-label", "Copy code");

      btn.addEventListener("click", () => {
        const text = pre.textContent ?? "";
        const markDone = () => {
          btn.textContent = "copied!";
          btn.classList.add("done");
          window.clearTimeout(timers.get(btn));
          timers.set(
            btn,
            window.setTimeout(() => {
              btn.textContent = "copy";
              btn.classList.remove("done");
            }, 1600),
          );
        };

        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(text).then(markDone, markDone);
          return;
        }

        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
        } catch {
          /* ignore */
        }
        document.body.removeChild(ta);
        markDone();
      });

      wrap.appendChild(btn);
    }

    return () => {
      for (const id of timers.values()) window.clearTimeout(id);
    };
  }, []);

  return null;
}
