import { LINE_HEIGHT } from "../lib/bodyEditorHelpers";

export function LineNumbers({
  count,
  heights,
  scrollRef,
}: {
  count: number;
  /** Per-logical-line pixel heights when word-wrap is on; omitted = fixed 21px. */
  heights?: number[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const lines = Array.from({ length: Math.max(count, 1) }, (_, i) => i + 1);
  return (
    <div
      ref={scrollRef}
      className="w-[46px] shrink-0 select-none overflow-hidden pr-4 text-right font-mono text-xs leading-[21px] text-muted-foreground"
    >
      {lines.map((lineNum, i) => (
        <div key={lineNum} style={{ height: heights?.[i] ?? LINE_HEIGHT }}>
          {lineNum}
        </div>
      ))}
    </div>
  );
}
