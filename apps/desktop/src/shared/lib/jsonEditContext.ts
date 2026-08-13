/** True when an env value should be inserted as a bare JSON literal (not a quoted string). */
export function isJsonLiteralValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const parsed = JSON.parse(trimmed);
    return typeof parsed === "number" || typeof parsed === "boolean" || parsed === null;
  } catch {
    return false;
  }
}

/** Whether `index` sits inside a JSON double-quoted string (honours `\"`). */
export function isInsideJsonString(value: string, index: number): boolean {
  let inString = false;
  let escaped = false;
  for (let i = 0; i < index; i++) {
    const ch = value[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString && ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') inString = !inString;
  }
  return inString;
}

/** Expand `{` into a multi-line block when opening a JSON object (not `{{var}}`). */
export function shouldExpandJsonBlock(value: string, start: number): boolean {
  if (isInsideJsonString(value, start)) return false;
  if (start > 0 && value[start - 1] === "{") return false;
  const before = value.slice(0, start);
  return start === 0 || /[:[,]\s*$/.test(before);
}

/** Wrap a committed `{{var}}` token in JSON quotes when it is not already a string literal. */
export function shouldWrapJsonString(
  value: string,
  start: number,
  end: number,
  /** Known env/global value; omit or pass null when unknown (random/secret). */
  resolvedValue?: string | null,
): boolean {
  if (isInsideJsonString(value, start)) return false;
  if (start > 0 && value[start - 1] === '"') return false;
  if (end < value.length && value[end] === '"') return false;
  if (resolvedValue != null && isJsonLiteralValue(resolvedValue)) return false;
  return true;
}

/** Format a variable token for insertion, optionally as a JSON string value. */
export function formatVarToken(name: string, wrapJsonString: boolean): string {
  const token = `{{${name}}}`;
  return wrapJsonString ? `"${token}"` : token;
}

const VAR_TOKEN = /\{\{[^}]+\}\}/g;

/** Unescape a single-quoted string body (without surrounding quotes). */
function unescapeSingleQuoted(content: string): string {
  let out = "";
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "\\" && i + 1 < content.length) {
      const next = content[i + 1];
      if (next === "'" || next === "\\" || next === '"') {
        out += next;
        i++;
        continue;
      }
      if (next === "n") {
        out += "\n";
        i++;
        continue;
      }
      if (next === "t") {
        out += "\t";
        i++;
        continue;
      }
      if (next === "r") {
        out += "\r";
        i++;
        continue;
      }
    }
    out += content[i];
  }
  return out;
}

/** Convert single-quoted string literals to JSON double-quoted strings. */
export function singleQuotesToDouble(json: string): string {
  let out = "";
  let inDouble = false;
  let escaped = false;
  let i = 0;

  while (i < json.length) {
    const ch = json[i];

    if (inDouble) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inDouble = false;
      i++;
      continue;
    }

    if (ch === '"') {
      inDouble = true;
      out += ch;
      i++;
      continue;
    }

    if (ch === "'") {
      let j = i + 1;
      let raw = "";
      while (j < json.length) {
        if (json[j] === "\\" && j + 1 < json.length) {
          raw += json[j] + json[j + 1];
          j += 2;
          continue;
        }
        if (json[j] === "'") break;
        raw += json[j];
        j++;
      }
      out += JSON.stringify(unescapeSingleQuoted(raw));
      i = j + 1;
      continue;
    }

    out += ch;
    i++;
  }
  return out;
}

/** Quote bare object keys (`name:` → `"name":`) outside of string literals. */
export function quoteUnquotedKeys(json: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  let i = 0;

  while (i < json.length) {
    const ch = json[i];

    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      i++;
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;
      i++;
      continue;
    }

    const tail = json.slice(i);
    const keyMatch = tail.match(/^(\s*)([a-zA-Z_$][\w$]*)(\s*):/);
    if (keyMatch) {
      const before = out.trimEnd();
      if (before.length === 0 || /[{,[]$/.test(before)) {
        out += `${keyMatch[1]}"${keyMatch[2]}"${keyMatch[3]}:`;
        i += keyMatch[0].length;
        continue;
      }
    }

    out += ch;
    i++;
  }
  return out;
}

/** JSON-like / JS object literal → strict JSON (keys quoted, `'` → `"`). */
export function normalizeLooseJson(json: string): string {
  return quoteUnquotedKeys(singleQuotesToDouble(json));
}

function isQuotedVarToken(body: string, start: number, length: number): boolean {
  return body[start - 1] === '"' && body[start + length] === '"';
}

/** Remove trailing commas before `}` or `]` (JSON5-style input, strict JSON output). */
export function stripTrailingCommas(json: string): string {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === ",") {
      let j = i + 1;
      while (j < json.length && /\s/.test(json[j])) j++;
      if (json[j] === "}" || json[j] === "]") continue;
    }
    out += ch;
  }
  return out;
}

/** Pretty-print JSON while leaving `{{var}}` tokens in place (quoted or bare literals). */
export function formatJsonPreservingVars(body: string, indent = 2): string {
  const restores: { quoted: string; bare: string }[] = [];
  let slot = 0;

  const masked = body.replace(VAR_TOKEN, (token, offset) => {
    if (isQuotedVarToken(body, offset, token.length)) return token;

    const id = slot++;
    restores.push({ quoted: `"__pg_var_${id}__"`, bare: token });
    return `"__pg_var_${id}__"`;
  });

  const normalized = normalizeLooseJson(masked);
  let formatted = JSON.stringify(JSON.parse(stripTrailingCommas(normalized)), null, indent);
  for (const { quoted, bare } of restores) {
    formatted = formatted.replace(quoted, bare);
  }
  return formatted;
}
