import hljs from "highlight.js";

/** hljs-highlight `code` as `language` (or auto-detect when omitted), HTML-escaping
 *  as a fallback if highlighting itself throws. */
export function highlightCode(code: string, language: string): string {
  if (!code) return "";
  try {
    if (language) return hljs.highlight(code, { language, ignoreIllegals: true }).value;
    return hljs.highlightAuto(code).value;
  } catch {
    return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}
