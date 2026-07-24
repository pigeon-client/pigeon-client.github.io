/** Shared editor word-wrap preference (request body + response). */
const WORD_WRAP_KEY = "pg_word_wrap";

type Listener = (value: boolean) => void;
const listeners = new Set<Listener>();

export function getWordWrap(): boolean {
  return localStorage.getItem(WORD_WRAP_KEY) === "true";
}

export function setWordWrap(value: boolean): void {
  localStorage.setItem(WORD_WRAP_KEY, String(value));
  for (const listener of listeners) listener(value);
}

export function subscribeWordWrap(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
