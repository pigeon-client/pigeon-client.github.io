import { corsHeaders, jsonResponse } from "./cors";
import { handleEvent } from "./events";
import { allowRequest } from "./rateLimit";
import { collectStats } from "./stats";
import { MAX_PAYLOAD_BYTES, validateEventPayload } from "./validation";

export interface Env {
  DB: D1Database;
  /** Comma-separated extra CORS origins (optional). */
  CORS_ORIGINS?: string;
  /** If set, GET /v1/stats requires Authorization: Bearer <token>. */
  STATS_TOKEN?: string;
}

function extraOrigins(env: Env): string[] {
  if (!env.CORS_ORIGINS) return ["*"];
  return env.CORS_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function clientKey(_request: Request, installId?: string): string {
  // Prefer install_id so we never key rate limits on IP (privacy).
  if (installId) return `id:${installId}`;
  return "anon";
}

async function readJsonBody(
  request: Request,
): Promise<{ ok: true; value: unknown } | { ok: false; error: string; status: number }> {
  const contentLength = request.headers.get("Content-Length");
  if (contentLength && Number(contentLength) > MAX_PAYLOAD_BYTES) {
    return { ok: false, error: "Payload too large", status: 413 };
  }

  const text = await request.text();
  if (text.length > MAX_PAYLOAD_BYTES) {
    return { ok: false, error: "Payload too large", status: 413 };
  }

  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, error: "Invalid JSON", status: 400 };
  }
}

async function postEvents(request: Request, env: Env): Promise<Response> {
  const origins = extraOrigins(env);
  const parsed = await readJsonBody(request);
  if (!parsed.ok) {
    return jsonResponse({ success: false, error: parsed.error }, parsed.status, request, origins);
  }

  const validation = validateEventPayload(parsed.value);
  if (!validation.ok) {
    return jsonResponse({ success: false, error: validation.error }, 400, request, origins);
  }

  if (!allowRequest(clientKey(request, validation.data.install_id))) {
    return jsonResponse({ success: false, error: "Rate limit exceeded" }, 429, request, origins);
  }

  try {
    await handleEvent(env, validation.data);
  } catch (err) {
    // Do not leak internal DB errors to clients.
    console.error("[analytics] event persist failed", err);
    return jsonResponse({ success: false, error: "Internal error" }, 500, request, origins);
  }

  return jsonResponse({ success: true }, 200, request, origins);
}

async function getStats(request: Request, env: Env): Promise<Response> {
  const origins = extraOrigins(env);

  if (env.STATS_TOKEN) {
    const auth = request.headers.get("Authorization") ?? "";
    const expected = `Bearer ${env.STATS_TOKEN}`;
    if (auth !== expected) {
      return jsonResponse({ success: false, error: "Unauthorized" }, 401, request, origins);
    }
  }

  if (!allowRequest("stats")) {
    return jsonResponse({ success: false, error: "Rate limit exceeded" }, 429, request, origins);
  }

  try {
    const stats = await collectStats(env);
    return jsonResponse(stats, 200, request, origins);
  } catch (err) {
    console.error("[analytics] stats failed", err);
    return jsonResponse({ success: false, error: "Internal error" }, 500, request, origins);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origins = extraOrigins(env);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, origins) });
    }

    if (request.method === "POST" && url.pathname === "/v1/events") {
      return postEvents(request, env);
    }

    if (request.method === "GET" && url.pathname === "/v1/stats") {
      return getStats(request, env);
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({ ok: true }, 200, request, origins);
    }

    return jsonResponse({ success: false, error: "Not found" }, 404, request, origins);
  },
};
