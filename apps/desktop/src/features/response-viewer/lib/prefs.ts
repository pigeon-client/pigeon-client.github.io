/** Persisted response-viewer preferences. Owns their storage keys. */
const WORD_WRAP_KEY = "pg_word_wrap";

export function getWordWrap(): boolean {
  return localStorage.getItem(WORD_WRAP_KEY) === "true";
}

export function setWordWrap(value: boolean): void {
  localStorage.setItem(WORD_WRAP_KEY, String(value));
}
