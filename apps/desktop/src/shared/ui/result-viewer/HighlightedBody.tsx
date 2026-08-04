import { HighlightedHtml } from "@/shared/ui/HighlightedHtml";
import { highlightCode } from "./highlightCode";

/** Syntax-highlighted code, no line numbers — the shared "just show me highlighted
 *  code" primitive. `ResponsePanel`'s line-numbered `CodeBlock` builds on the same
 *  `highlightCode` helper but owns its own (more elaborate) layout. */
export function HighlightedBody({
  code,
  language,
  className,
}: {
  code: string;
  language: string;
  className?: string;
}) {
  return (
    <HighlightedHtml
      html={highlightCode(code, language)}
      className={className ?? (language ? `language-${language} hljs` : "hljs")}
    />
  );
}
