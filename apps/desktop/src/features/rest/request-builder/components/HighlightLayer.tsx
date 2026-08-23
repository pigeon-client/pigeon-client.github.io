import { cn } from "@pigeon/ui";
import { useDeferredValue, useMemo } from "react";
import { maskVarTokensForHighlight } from "@/shared/lib/varTokenSegments";
import { HighlightedHtml } from "@/shared/ui/HighlightedHtml";
import { hljsHighlight, LINE_HEIGHT } from "../lib/bodyEditorHelpers";

export function HighlightLayer({
  code,
  language,
  wrap,
  scrollRef,
}: {
  code: string;
  language: string;
  wrap: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const deferredCode = useDeferredValue(code);
  const highlighted = useMemo(() => {
    const src = maskVarTokensForHighlight(deferredCode);
    // Skip hljs on huge bodies — escape only so typing stays responsive.
    if (src.length > 80_000) return hljsHighlight(src, "");
    return hljsHighlight(src, language);
  }, [deferredCode, language]);

  return (
    <div
      ref={scrollRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-auto px-4 pb-1.5"
    >
      <pre
        className={cn(
          "m-0 bg-transparent font-mono text-code leading-[21px]",
          wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre",
        )}
      >
        <HighlightedHtml
          html={highlighted}
          className={language ? `language-${language} hljs` : "hljs"}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-code)",
            lineHeight: `${LINE_HEIGHT}px`,
            background: "transparent",
          }}
        />
      </pre>
    </div>
  );
}
