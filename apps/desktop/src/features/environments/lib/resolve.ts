import { resolveTemplate } from "@/shared/lib/template";
import type { Environment, EnvVariable } from "../types";

/** Enabled, keyed variables → name→value map (first occurrence wins). */
function toMap(vars: EnvVariable[] | undefined): Map<string, string> {
  const m = new Map<string, string>();
  for (const v of vars ?? []) {
    const key = v.key.trim();
    if (v.enabled && key && !m.has(key)) m.set(key, v.value);
  }
  return m;
}

/**
 * Build a lookup with the R7 precedence: active environment > globals.
 * (`$`-random built-ins are handled after this by `resolveTemplate`.)
 */
export function makeResolver(
  active: Environment | null,
  globals: EnvVariable[],
): (name: string) => string | undefined {
  const a = active ? toMap(active.variables) : new Map<string, string>();
  const g = toMap(globals);
  return (name) => a.get(name) ?? g.get(name);
}

/** Non-strict resolve for previews (UrlBar) — leaves unknown tokens intact. */
export function resolveForPreview(
  str: string,
  active: Environment | null,
  globals: EnvVariable[],
): string {
  return resolveTemplate(str, makeResolver(active, globals)).result;
}
