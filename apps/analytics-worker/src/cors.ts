const DEFAULT_ALLOWED_ORIGINS = ["null", "tauri://localhost", "http://tauri.localhost"];

/** Build CORS headers. Desktop webviews often send Origin: null or tauri://. */
export function corsHeaders(request: Request, extraOrigins: string[] = []): HeadersInit {
  const origin = request.headers.get("Origin");
  const allowed = new Set([...DEFAULT_ALLOWED_ORIGINS, ...extraOrigins]);

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (origin && allowed.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else if (!origin) {
    // Non-browser clients (curl, scripts) — no Origin header.
    headers["Access-Control-Allow-Origin"] = "*";
  } else if (allowed.has("*")) {
    headers["Access-Control-Allow-Origin"] = "*";
  } else {
    // Reflect only known desktop origins; still answer OPTIONS so the app can fail soft.
    headers["Access-Control-Allow-Origin"] = "null";
  }

  return headers;
}

export function jsonResponse(
  body: unknown,
  status: number,
  request: Request,
  extraOrigins: string[] = [],
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request, extraOrigins),
    },
  });
}
