import { formatTokenTooltip, getTokenPreview } from "@/shared/lib/tokenPreview";
import { TokenChip } from "@/shared/ui/TokenChip";

/** Split plain text and `{{tokens}}` for colored overlay rendering + hover tooltips. */
export function renderTokenText(text: string, resolveToken?: (name: string) => string | undefined) {
  return text.split(/(\{\{[^}]*\}\})/g).map((part, i) => {
    const m = part.match(/^\{\{([^}]+)\}\}$/);
    if (!m) {
      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: positional text fragments
        <span key={`t-${i}`} className="text-foreground">
          {part}
        </span>
      );
    }
    const name = m[1].trim();
    const info = resolveToken
      ? getTokenPreview(name, resolveToken)
      : { name, value: null, random: name.startsWith("$") };
    return (
      <TokenChip
        // biome-ignore lint/suspicious/noArrayIndexKey: positional text fragments
        key={`t-${i}`}
        token={part}
        missing={!info.random && info.value === null}
        tooltip={resolveToken ? formatTokenTooltip(info) : undefined}
      />
    );
  });
}
