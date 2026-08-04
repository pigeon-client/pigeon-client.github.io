import { resolveTemplate } from "@/shared/lib/template";

/** Resolves a `{{token}}` name to a value (env → globals; $-random handled by
    resolveTemplate). Undefined means the variable is missing → send blocked. */
export type Resolver = (name: string) => string | undefined;

/** Thrown when one or more `{{token}}`s can't be resolved. */
export class UnresolvedVariablesError extends Error {
  variables: string[];
  constructor(variables: string[]) {
    super(`Unresolved variable${variables.length > 1 ? "s" : ""}: ${variables.join(", ")}`);
    this.name = "UnresolvedVariablesError";
    this.variables = variables;
  }
}

/** Strict single-string resolution — every `{{token}}` must resolve or this throws. */
export function interpolateStrict(str: string, resolve: Resolver): string {
  const { result, missing } = resolveTemplate(str, resolve);
  if (missing.length > 0) throw new UnresolvedVariablesError(missing);
  return result;
}

/**
 * Accumulating variant for callers that interpolate several fields (url, headers,
 * body) before deciding whether to block the send — collects every missing
 * variable across calls instead of throwing on the first one.
 */
export function createAccumulatingResolver(resolve: Resolver) {
  const missing = new Set<string>();
  const sub = (s: string): string => {
    const r = resolveTemplate(s, resolve);
    for (const m of r.missing) missing.add(m);
    return r.result;
  };
  return { sub, missing };
}
