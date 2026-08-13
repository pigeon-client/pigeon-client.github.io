import hljs from "highlight.js";
import { bodyUiGroup } from "@/shared/lib/contentType";
import type { BodyType } from "@/shared/types";

export type RadioId = "none" | "json" | "form-data" | "x-www-form-urlencoded" | "raw" | "binary";

export const LINE_HEIGHT = 21;

export function radioFromBodyType(bodyType: BodyType): RadioId {
  const group = bodyUiGroup(bodyType);
  if (group === "none") return "none";
  if (group === "json") return "json";
  if (group === "form-data") return "form-data";
  if (group === "urlencoded") return "x-www-form-urlencoded";
  if (group === "binary") return "binary";
  return "raw";
}

export function defaultRawFormat(bodyType: BodyType): BodyType {
  return bodyUiGroup(bodyType) === "raw" ? bodyType : "text/plain";
}

export function defaultBinaryFormat(bodyType: BodyType): BodyType {
  return bodyUiGroup(bodyType) === "binary" ? bodyType : "application/octet-stream";
}

/** Unlike `shared/ui/result-viewer`'s `highlightCode`, this never auto-detects a
 *  language when `language` is empty — it just HTML-escapes, since an empty
 *  language here means "plain text," not "guess." */
export function hljsHighlight(code: string, language: string): string {
  if (!code) return "";
  try {
    if (language) return hljs.highlight(code, { language, ignoreIllegals: true }).value;
    return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  } catch {
    return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

export function measureWrappedLineHeights(text: string, widthPx: number): number[] {
  if (widthPx <= 0) return text.split("\n").map(() => LINE_HEIGHT);
  const measure = document.createElement("div");
  measure.style.cssText = [
    "position:absolute",
    "visibility:hidden",
    "pointer-events:none",
    `width:${widthPx}px`,
    "font-family:var(--font-mono)",
    "font-size:var(--text-code)",
    `line-height:${LINE_HEIGHT}px`,
    "white-space:pre-wrap",
    "overflow-wrap:break-word",
    "word-break:break-word",
  ].join(";");
  document.body.appendChild(measure);
  const heights = text.split("\n").map((line) => {
    measure.textContent = line.length > 0 ? line : " ";
    return Math.max(LINE_HEIGHT, measure.offsetHeight);
  });
  document.body.removeChild(measure);
  return heights;
}
