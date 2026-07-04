/**
 * Pure {{var}} string interpolation. No env/store deps.
 * Replaces {{name}} tokens using the provided variable map.
 * Unknown tokens are left intact.
 */
export function interpolate(str: string, vars: Record<string, string>): string {
  return str.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const trimmed = key.trim();
    return Object.hasOwn(vars, trimmed) ? vars[trimmed] : match;
  });
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
