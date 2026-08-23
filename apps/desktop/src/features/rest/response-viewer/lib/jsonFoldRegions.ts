export interface FoldRegion {
  startLine: number;
  endLine: number;
}

/** Multi-line `{…}` / `[…]` blocks in formatted JSON — foldable in the response viewer. */
export function findJsonFoldRegions(code: string): FoldRegion[] {
  const regions: FoldRegion[] = [];
  const stack: { startLine: number; open: "{" | "[" }[] = [];
  let inString = false;
  let isEscaped = false;
  let line = 0;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    // Count newlines before the in-string continue so strings containing `\n`
    // don't skip the line counter (and so we never slice(0, i).split on each char).
    if (ch === "\n") line++;

    if (inString) {
      if (isEscaped) isEscaped = false;
      else if (ch === "\\") isEscaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{" || ch === "[") {
      stack.push({ startLine: line, open: ch });
      continue;
    }
    if (ch === "}" || ch === "]") {
      const top = stack.pop();
      if (!top) continue;
      const matches = (top.open === "{" && ch === "}") || (top.open === "[" && ch === "]");
      if (matches && line > top.startLine) {
        regions.push({ startLine: top.startLine, endLine: line });
      }
    }
  }

  return regions;
}

export function foldRegionsByStart(regions: FoldRegion[]): Map<number, FoldRegion> {
  const byStart = new Map<number, FoldRegion>();
  for (const region of regions) byStart.set(region.startLine, region);
  return byStart;
}

export function isFoldStart(line: number, regions: FoldRegion[]): FoldRegion | undefined {
  return foldRegionsByStart(regions).get(line);
}

export function isLineHidden(
  line: number,
  collapsed: ReadonlySet<number>,
  regions: FoldRegion[],
): boolean {
  const byStart = foldRegionsByStart(regions);
  for (const start of collapsed) {
    const region = byStart.get(start);
    if (region && line > region.startLine && line <= region.endLine) return true;
  }
  return false;
}

export function collapsedLineText(_line: string, region: FoldRegion, lines: string[]): string {
  const open = lines[region.startLine].trim().match(/^(\{|\[)/)?.[1] ?? "{";
  const close = open === "{" ? "}" : "]";
  const indent = lines[region.startLine].match(/^(\s*)/)?.[1] ?? "";
  return `${indent}${open} … ${close}`;
}
