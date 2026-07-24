import type { HttpMethod } from "@/shared/types";

/** Methods the app can select, send, and import. */
export const HTTP_METHODS: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "QUERY",
];

const METHOD_SET = new Set<string>(HTTP_METHODS);

export function isHttpMethod(value: string): value is HttpMethod {
  return METHOD_SET.has(value.toUpperCase());
}

/**
 * RFC 9110 §9.3.1 / §9.3.2 — request content has no defined semantics for
 * GET/HEAD; clients SHOULD NOT generate it. QUERY (RFC 10008) expects a body.
 */
export function methodAllowsRequestBody(method: string): boolean {
  const m = method.toUpperCase();
  return m !== "GET" && m !== "HEAD";
}

/** Tailwind text class for method accent color. */
export function methodTextClass(method: string): string {
  switch (method.toUpperCase()) {
    case "GET":
      return "text-method-get";
    case "POST":
      return "text-method-post";
    case "PUT":
      return "text-method-put";
    case "PATCH":
      return "text-method-patch";
    case "DELETE":
      return "text-method-delete";
    case "HEAD":
      return "text-method-head";
    case "OPTIONS":
      return "text-method-options";
    case "QUERY":
      return "text-method-query";
    default:
      return "text-method-options";
  }
}
