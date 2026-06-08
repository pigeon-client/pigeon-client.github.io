/**
 * Parse user input URL
 * :3000 -> http://localhost:3000
 * Respects existing protocols
 */
export function parseUrl(input: string): string {
  input = input.trim();
  
  // Port shortcut: :3000, :3000/api, :3000?query=1
  if (input.startsWith(':')) {
    return `http://localhost${input}`;
  }
  
  // If already has protocol, respect it
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return input;
  }
  
  // Default to http:// for domains without protocol
  return `http://${input}`;
}

/**
 * Extract domain from URL for grouping
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return 'unknown';
  }
}

/**
 * Extract main domain (e.g., api.example.com -> example.com)
 */
export function extractMainDomain(hostname: string): string {
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join('.');
}

/**
 * Extract endpoint name from URL for auto-naming tabs
 */
export function extractEndpoint(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    if (path === '/' || !path) return parsed.hostname;
    return path;
  } catch {
    return url;
  }
}
