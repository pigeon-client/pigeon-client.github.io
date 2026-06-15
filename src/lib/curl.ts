import type { RequestConfig } from "../types";
import { parseUrl } from "./url";

/**
 * Generate cURL command from request config
 */
export function generateCurl(config: RequestConfig): string {
  const parts: string[] = ["curl"];

  // Method
  if (config.method !== "GET") {
    parts.push(`-X ${config.method}`);
  }

  // Headers
  config.headers.forEach(({ key, value, enabled }) => {
    if (enabled && key && value) {
      parts.push(`-H "${key}: ${value}"`);
    }
  });

  // Auth
  if (config.auth.type === "basic" && config.auth.username) {
    parts.push(`-u "${config.auth.username}:${config.auth.password}"`);
  } else if (config.auth.type === "bearer" && config.auth.token) {
    parts.push(`-H "Authorization: Bearer ${config.auth.token}"`);
  }

  // Body
  if (config.body && config.bodyType !== "none") {
    const escapedBody = config.body.replace(/'/g, "'\\''");
    parts.push(`-d '${escapedBody}'`);
  } else if (
    config.formData.length > 0 &&
    config.bodyType === "application/x-www-form-urlencoded"
  ) {
    const formParams = config.formData
      .filter((f) => f.enabled)
      .map((f) => `--data-urlencode "${f.key}=${f.value}"`);
    parts.push(...formParams);
  }

  // URL
  const url = parseUrl(config.url);
  parts.push(`"${url}"`);

  return parts.join(" ");
}
