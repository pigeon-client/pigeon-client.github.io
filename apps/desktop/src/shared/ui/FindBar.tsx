import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useRef } from "react";

interface FindBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  matchCount: number;
  /** 0-based index of the current match; ignored when matchCount is 0. */
  index: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  /** data-testid prefix, e.g. "body-find" → body-find-input / -count / -next / -prev / -close */
  testId: string;
}

/** In-panel find widget (⌘F). Enter = next, Shift+Enter = previous, Esc = close. */
export function FindBar({
  query,
  onQueryChange,
  matchCount,
  index,
  onNext,
  onPrev,
  onClose,
  testId,
}: FindBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <search
      data-testid={testId}
      className="flex items-center gap-1 rounded border border-border bg-popover px-1.5 py-1 shadow-lg"
      onKeyDown={(e) => {
        // The find bar owns its keys — never let ⌘A/⌘F/Escape handlers underneath fire.
        e.stopPropagation();
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (e.shiftKey) onPrev();
          else onNext();
        }
      }}
    >
      <input
        ref={inputRef}
        data-testid={`${testId}-input`}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Find…"
        spellCheck={false}
        className="h-6 w-40 bg-transparent px-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground/60 outline-none"
      />
      <span
        data-testid={`${testId}-count`}
        className="min-w-[44px] text-center font-mono text-2xs text-muted-foreground"
      >
        {query ? (matchCount > 0 ? `${index + 1}/${matchCount}` : "0/0") : ""}
      </span>
      <button
        type="button"
        data-testid={`${testId}-prev`}
        onClick={onPrev}
        disabled={matchCount === 0}
        aria-label="Previous match"
        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-default disabled:opacity-40"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        data-testid={`${testId}-next`}
        onClick={onNext}
        disabled={matchCount === 0}
        aria-label="Next match"
        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-default disabled:opacity-40"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        data-testid={`${testId}-close`}
        onClick={onClose}
        aria-label="Close find"
        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </search>
  );
}
