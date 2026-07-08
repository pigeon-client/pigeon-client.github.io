import type React from "react";
import { useMemo, useRef, useState } from "react";
import { selectActiveEnv, useEnvStore } from "../store";
import { RANDOM_TOKENS } from "../types";

export interface VarSuggestion {
  name: string;
  kind: "env" | "global" | "random";
  /** Current value (env/globals); undefined for `$`-random built-ins. */
  value?: string;
}

/** Apply a replacement value + caret position back to the source input. */
export type ApplyFn = (next: string, caret: number) => void;

/**
 * `{{variable}}` autocomplete state, shared by the URL bar, key/value editors,
 * and the body editor. Detect an open `{{…` at the caret, navigate, and insert.
 */
export function useVarAutocomplete() {
  const activeEnv = useEnvStore(selectActiveEnv);
  const globals = useEnvStore((s) => s.globals);

  const varNames = useMemo<VarSuggestion[]>(() => {
    const out: VarSuggestion[] = [];
    const seen = new Set<string>();
    for (const v of activeEnv?.variables ?? []) {
      const k = v.key.trim();
      if (v.enabled && k && !seen.has(k)) {
        seen.add(k);
        out.push({ name: k, kind: "env", value: v.secret ? "•••••" : v.value });
      }
    }
    for (const v of globals) {
      const k = v.key.trim();
      if (v.enabled && k && !seen.has(k)) {
        seen.add(k);
        out.push({ name: k, kind: "global", value: v.secret ? "•••••" : v.value });
      }
    }
    for (const t of RANDOM_TOKENS) out.push({ name: t, kind: "random" });
    return out;
  }, [activeEnv, globals]);

  const [ac, setAc] = useState<{ query: string; start: number } | null>(null);
  const [index, setIndex] = useState(0);
  const lastQuery = useRef<string | null>(null);

  // Proper search: substring match, but names that *start with* the query rank
  // first (stable within each group), so typing "em" surfaces "email" up top.
  const items = ac
    ? varNames
        .filter((v) => v.name.toLowerCase().includes(ac.query.toLowerCase()))
        .map((v, i) => ({ v, i }))
        .sort((a, b) => {
          const q = ac.query.toLowerCase();
          const ap = a.v.name.toLowerCase().startsWith(q) ? 0 : 1;
          const bp = b.v.name.toLowerCase().startsWith(q) ? 0 : 1;
          return ap - bp || a.i - b.i;
        })
        .map(({ v }) => v)
    : [];

  /** Open the popover when the caret sits inside an unclosed `{{…`. Reset the
      highlighted index only when the query changes (not on every keyup — that
      broke arrow-key navigation). */
  const detect = (value: string, caret: number) => {
    const m = value.slice(0, caret).match(/\{\{([^}]*)$/);
    if (m) {
      const query = m[1];
      if (lastQuery.current !== query) {
        setIndex(0);
        lastQuery.current = query;
      }
      setAc({ query, start: caret - m[0].length });
    } else {
      lastQuery.current = null;
      if (ac) setAc(null);
    }
  };

  const close = () => {
    lastQuery.current = null;
    setAc(null);
  };

  const commit = (name: string, value: string, caret: number, apply: ApplyFn) => {
    if (!ac) return;
    const token = `{{${name}}}`;
    // Swallow an auto-closed `}}` right after the caret (BodyEditor auto-pairs).
    const after = value.slice(caret);
    const rest = after.startsWith("}}") ? after.slice(2) : after;
    apply(value.slice(0, ac.start) + token + rest, ac.start + token.length);
    lastQuery.current = null;
    setAc(null);
  };

  /** Handle nav/insert keys. Returns true if the key was consumed. */
  const onKeyDown = (
    e: React.KeyboardEvent,
    value: string,
    caret: number,
    apply: ApplyFn,
  ): boolean => {
    if (!ac || items.length === 0) return false;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => (i + 1) % items.length);
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => (i - 1 + items.length) % items.length);
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      commit(items[index].name, value, caret, apply);
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return true;
    }
    return false;
  };

  return { open: !!ac, items, index, setIndex, detect, close, onKeyDown, commit };
}
