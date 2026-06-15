import { type CSSProperties, useEffect, useRef } from "react";

interface Props {
  html: string;
  className?: string;
  style?: CSSProperties;
}

export function HighlightedHtml({ html, className, style }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = html;
    }
  }, [html]);
  return <div ref={ref} className={className} style={style} />;
}
