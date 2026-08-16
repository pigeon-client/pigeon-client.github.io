import { cn } from "@pigeon/ui";
import { formatTokenTooltip, getTokenPreview } from "@/shared/lib/tokenPreview";
import { parseVarToken, splitVarTokens } from "@/shared/lib/varTokenSegments";
import { TokenChip } from "@/shared/ui/TokenChip";
import { LINE_HEIGHT } from "../lib/bodyEditorHelpers";

export function BodyVarOverlay({
  code,
  wrap,
  scrollRef,
  resolveToken,
  onTokenFocus,
}: {
  code: string;
  wrap: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  resolveToken: (name: string) => string | undefined;
  onTokenFocus: (offset: number) => void;
}) {
  let offset = 0;
  const parts = splitVarTokens(code);

  return (
    <div
      ref={scrollRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-dropdown overflow-auto px-4 pb-1.5"
    >
      <pre
        className={cn(
          "m-0 bg-transparent font-mono text-code leading-[21px]",
          wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre",
        )}
        style={{ lineHeight: `${LINE_HEIGHT}px` }}
      >
        {parts.map((part, i) => {
          const partStart = offset;
          offset += part.length;
          const name = parseVarToken(part);
          if (!name) {
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: positional body fragments
              <span key={`p-${i}`} className="text-transparent">
                {part}
              </span>
            );
          }
          const info = getTokenPreview(name, resolveToken);
          return (
            <TokenChip
              // biome-ignore lint/suspicious/noArrayIndexKey: positional body fragments
              key={`v-${i}`}
              token={part}
              missing={!info.random && info.value === null}
              tooltip={formatTokenTooltip(info)}
              onMouseDown={() => onTokenFocus(partStart + part.length)}
            />
          );
        })}
      </pre>
    </div>
  );
}
