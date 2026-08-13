/** Matches a single `{{variable}}` token (non-greedy name). */
export const VAR_TOKEN_RE = /\{\{[^}]+\}\}/g;

/** Split text into alternating plain spans and `{{token}}` segments. */
export function splitVarTokens(text: string): string[] {
  return text.split(/(\{\{[^}]+\}\})/g);
}

export function parseVarToken(part: string): string | null {
  const m = part.match(/^\{\{([^}]+)\}\}$/);
  return m ? m[1].trim() : null;
}

/** Same-length mask so highlight.js layout stays aligned with the textarea. */
export function maskVarTokensForHighlight(code: string): string {
  return code.replace(VAR_TOKEN_RE, (token) => "\u2007".repeat(token.length));
}
