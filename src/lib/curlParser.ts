import { RequestConfig, HttpMethod, BodyType } from '../types';

const methodPattern = /^\s*(GET|POST|PUT|PATCH|DELETE)\b/i;

export function parseCurl(input: string): Partial<RequestConfig> | null {
  const result: Partial<RequestConfig> = {
    method: 'GET',
    url: '',
    headers: [],
    body: '',
    bodyType: 'none',
    params: [],
  };

  const lines = input.replace(/\\\n/g, ' ').trim();
  const tokens = tokenize(lines);
  if (tokens.length === 0) return null;

  // First token might be "curl"
  let i = 0;
  if (tokens[i].toLowerCase() === 'curl') i++;

  // Check for method
  const methodMatch = tokens[i]?.match(methodPattern);
  if (methodMatch && i === 1) {
    result.method = methodMatch[1].toUpperCase() as HttpMethod;
    i++;
  }

  // Parse arguments
  const urlToken = tokens[i]?.replace(/^['"]|['"]$/g, '');
  if (urlToken && !urlToken.startsWith('-')) {
    result.url = urlToken;
    i++;
  } else {
    // URL might be after -X/--request
    while (i < tokens.length) {
      const t = tokens[i].replace(/^['"]|['"]$/g, '');
      if (t === '-X' || t === '--request') {
        i++;
        if (i < tokens.length) {
          result.method = tokens[i].replace(/^['"]|['"]$/g, '').toUpperCase() as HttpMethod;
          i++;
        }
      } else if (t === '-H' || t === '--header') {
        i++;
        if (i < tokens.length) {
          const header = tokens[i].replace(/^['"]|['"]$/g, '');
          const colonIdx = header.indexOf(':');
          if (colonIdx > 0) {
            const key = header.slice(0, colonIdx).trim();
            const value = header.slice(colonIdx + 1).trim();
            result.headers?.push({ key, value, enabled: true });
          }
          i++;
        }
      } else if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary') {
        i++;
        if (i < tokens.length) {
          result.body = tokens[i].replace(/^['"]|['"]$/g, '');
          result.bodyType = 'application/json' as BodyType;
          i++;
        }
      } else if (!t.startsWith('-')) {
        result.url = t;
        i++;
        break;
      } else {
        i++;
      }
    }
  }

  // Parse rest of tokens
  while (i < tokens.length) {
    const t = tokens[i].replace(/^['"]|['"]$/g, '');

    if (t === '-X' || t === '--request') {
      i++;
      if (i < tokens.length) {
        result.method = tokens[i].replace(/^['"]|['"]$/g, '').toUpperCase() as HttpMethod;
        i++;
      }
    } else if (t === '-H' || t === '--header') {
      i++;
      if (i < tokens.length) {
        const header = tokens[i].replace(/^['"]|['"]$/g, '');
        const colonIdx = header.indexOf(':');
        if (colonIdx > 0) {
          const key = header.slice(0, colonIdx).trim();
          const value = header.slice(colonIdx + 1).trim();
          result.headers?.push({ key, value, enabled: true });
        }
        i++;
      }
    } else if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary') {
      i++;
      if (i < tokens.length) {
        result.body = tokens[i].replace(/^['"]|['"]$/g, '');
        result.bodyType = textLooksLikeJson(result.body) ? 'application/json' as BodyType : 'text/plain' as BodyType;
        i++;
      }
    } else if (t.startsWith('-')) {
      i++;
    } else {
      i++;
    }
  }

  if (!result.url) return null;
  return result;
}

function textLooksLikeJson(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
      current += ch;
    } else if (ch === '"' && !inSingle) {
      inDouble = !inDouble;
      current += ch;
    } else if (/\s/.test(ch) && !inSingle && !inDouble) {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}
