import { type CSSProperties, useEffect, useRef } from "react";

interface Props {
  /**
   * TRUSTED HTML ONLY — this string is assigned to `innerHTML` verbatim.
   * Callers must pass output of `hljs.highlight(...)` (which escapes its input)
   * or otherwise pre-escaped markup. Never pass raw response/user text here.
   */
  html: string;
  className?: string;
  style?: CSSProperties;
}

/** Renders pre-escaped (highlight.js) markup. See the `html` prop contract. */
export function HighlightedHtml({ html, className, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = html;
    }
  }, [html]);
  return <div ref={ref} className={className} style={style} />;
}
