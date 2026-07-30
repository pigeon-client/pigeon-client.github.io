/** Case-insensitive, non-overlapping match offsets of `query` in `text`. */
export function findMatches(text: string, query: string): number[] {
  if (!query) return [];
  const hay = text.toLowerCase();
  const needle = query.toLowerCase();
  const out: number[] = [];
  let i = hay.indexOf(needle);
  while (i !== -1) {
    out.push(i);
    // Cap pathological cases (single-char query on a huge body).
    if (out.length >= 5000) break;
    i = hay.indexOf(needle, i + needle.length);
  }
  return out;
}
