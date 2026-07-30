import { type Environment, type EnvVariable, makeResolver } from "@/features/environments";
import { resolveTemplate } from "@/shared/lib/template";

/** Strict {{var}} resolution failure — mirrors execution's UnresolvedVariablesError. */
export class McpUnresolvedVariablesError extends Error {
  constructor(public missing: string[]) {
    super(`Unresolved variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
    this.name = "McpUnresolvedVariablesError";
  }
}

/** Strict on connect — every `{{token}}` must resolve or this throws. */
export function interpolateStrict(
  str: string,
  active: Environment | null,
  globals: EnvVariable[],
): string {
  const resolve = makeResolver(active, globals);
  const { result, missing } = resolveTemplate(str, resolve);
  if (missing.length > 0) throw new McpUnresolvedVariablesError(missing);
  return result;
}

/** "Key: Value" per line → header map, same convention as raw header text areas elsewhere. */
export function parseHeaderLines(text: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf(":");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    if (key) headers[key] = trimmed.slice(idx + 1).trim();
  }
  return headers;
}
