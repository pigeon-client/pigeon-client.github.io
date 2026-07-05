/**
 * Pure {{var}} string interpolation. No env/store deps.
 * Replaces {{name}} tokens using the provided variable map.
 * Unknown tokens are left intact. (Legacy non-strict helper.)
 */
export function interpolate(str: string, vars: Record<string, string>): string {
  return str.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmed = key.trim();
    return Object.hasOwn(vars, trimmed) ? vars[trimmed] : match;
  });
}

/* ── Built-in random data tokens ($-prefixed, regenerated per resolve) ── */
const FIRST_NAMES = ["Ada", "Linus", "Grace", "Alan", "Margaret", "Dennis", "Barbara", "Ken"];
const LAST_NAMES = ["Lovelace", "Torvalds", "Hopper", "Turing", "Hamilton", "Ritchie", "Liskov"];

function pick(list: readonly string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

function uuidv4(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Resolve a `$`-prefixed built-in token, or `undefined` if not one. */
export function randomBuiltin(name: string): string | undefined {
  switch (name) {
    case "$firstName":
      return pick(FIRST_NAMES);
    case "$lastName":
      return pick(LAST_NAMES);
    case "$email":
      return `${pick(FIRST_NAMES).toLowerCase()}.${pick(LAST_NAMES).toLowerCase()}@example.com`;
    case "$uuid":
      return uuidv4();
    default:
      return undefined;
  }
}

export interface ResolveResult {
  result: string;
  /** Unique names of tokens that could not be resolved. */
  missing: string[];
}

/**
 * Strict {{token}} resolution. For each token, `lookup(name)` supplies a value;
 * `$`-prefixed tokens fall back to the built-in random generators. Tokens with
 * no value are recorded in `missing` (and left intact in `result`).
 */
export function resolveTemplate(
  str: string,
  lookup: (name: string) => string | undefined,
): ResolveResult {
  const missing = new Set<string>();
  const result = str.replace(/\{\{([^}]+)\}\}/g, (match, raw) => {
    const name = raw.trim();
    const fromLookup = lookup(name);
    if (fromLookup !== undefined) return fromLookup;
    if (name.startsWith("$")) {
      const built = randomBuiltin(name);
      if (built !== undefined) return built;
    }
    missing.add(name);
    return match;
  });
  return { result, missing: [...missing] };
}

/**
 * Parse a `key=value` newline-delimited string into a record.
 * Skips blank lines and `#` comments.
 */
export function parseEnvString(str: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of str.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (key) result[key] = value;
    }
  }
  return result;
}
