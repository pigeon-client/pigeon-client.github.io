import type React from "react";

/**
 * Structural contract for the value-field `{{variable}}` autocomplete.
 * Defined here (not imported from features/environments) so the shared layer
 * never depends on a feature — the implementation is injected by consumers,
 * normally via `features/environments`' `VarKeyValueEditor` wrapper.
 */
export interface ValueSuggestion {
  name: string;
  kind: "env" | "global" | "random";
  /** Current value (env/globals); undefined for `$`-random built-ins. */
  value?: string;
}

/** Apply a replacement value + caret position back to the source input. */
export type ApplyValueFn = (next: string, caret: number) => void;

export interface ValueAutocompleteControl {
  open: boolean;
  items: ValueSuggestion[];
  index: number;
  setIndex: (i: number) => void;
  detect: (value: string, caret: number) => void;
  close: () => void;
  onKeyDown: (e: React.KeyboardEvent, value: string, caret: number, apply: ApplyValueFn) => boolean;
  commit: (name: string, value: string, caret: number, apply: ApplyValueFn) => void;
}

export type SuggestionsComponent = React.ComponentType<{
  items: ValueSuggestion[];
  index: number;
  onHover: (i: number) => void;
  onPick: (name: string) => void;
  className?: string;
  style?: React.CSSProperties;
}>;

/** Everything KeyValueEditor needs to offer `{{var}}` autocomplete on values. */
export interface ValueAutocomplete extends ValueAutocompleteControl {
  Suggestions: SuggestionsComponent;
}
