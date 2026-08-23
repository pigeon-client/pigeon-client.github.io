import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { contentTypeForBody } from "@/shared/lib/contentType";
import { methodAllowsRequestBody } from "@/shared/lib/httpMethod";
import { isTauri } from "@/shared/lib/platform";
import { decodeIpcResponse, type IpcApiResponse, utf8Bytes } from "../lib/bytes";
import {
  isEventStreamContentType,
  type SseEvent,
  type SseMeta,
  SseParser,
  sseEventsToBody,
} from "../lib/sse";
import type { HttpRequest } from "../ports/HttpClient";
import type { ApiResponse } from "../types";

export interface SseHandlers {
  onMeta?: (meta: SseMeta) => void;
  onEvent?: (event: SseEvent) => void;
}

interface RustSseMeta {
  streamId: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  contentType: string;
}

interface RustSseEvent {
  streamId: string;
  event: string;
  data: string;
  id?: string;
  raw: string;
}

interface RustSseDone {
  streamId: string;
  error?: string | null;
}

/**
 * Send a request that may be an SSE stream. If the response is
 * `text/event-stream`, handlers fire live; otherwise behaves like a normal send.
 * Returns a final `ApiResponse` (body = joined SSE text when streamed).
 */
export async function sendMaybeSse(
  request: HttpRequest,
  streamId: string,
  handlers: SseHandlers = {},
  signal?: AbortSignal,
): Promise<ApiResponse> {
  if (isTauri()) {
    return sendTauriMaybeSse(request, streamId, handlers, signal);
  }
  return sendBrowserMaybeSse(request, streamId, handlers, signal);
}

export async function cancelSseStream(streamId: string): Promise<void> {
  if (!isTauri()) return;
  try {
    await invoke("cancel_sse_stream", { streamId });
  } catch {
    // Stream may already be gone.
  }
}

async function sendTauriMaybeSse(
  request: HttpRequest,
  streamId: string,
  handlers: SseHandlers,
  signal?: AbortSignal,
): Promise<ApiResponse> {
  const events: SseEvent[] = [];
  const unlisteners: UnlistenFn[] = [];

  const onAbort = () => {
    void cancelSseStream(streamId);
  };
  signal?.addEventListener("abort", onAbort);

  try {
    const ingestRustEvent = (payload: RustSseEvent) => {
      const ev: SseEvent = {
        event: payload.event,
        data: payload.data,
        raw: payload.raw,
      };
      if (payload.id) ev.id = payload.id;
      events.push(ev);
      handlers.onEvent?.(ev);
    };

    unlisteners.push(
      await listen<RustSseMeta>("sse-meta", (e) => {
        if (e.payload.streamId !== streamId) return;
        handlers.onMeta?.({
          status: e.payload.status,
          statusText: e.payload.statusText,
          headers: e.payload.headers,
          contentType: e.payload.contentType,
        });
      }),
    );
    unlisteners.push(
      await listen<{ streamId: string; events: RustSseEvent[] }>("sse-event-batch", (e) => {
        if (e.payload.streamId !== streamId) return;
        for (const payload of e.payload.events) ingestRustEvent(payload);
      }),
    );
    // Done is informational; invoke resolves with the final ApiResponse.
    unlisteners.push(
      await listen<RustSseDone>("sse-done", (e) => {
        if (e.payload.streamId !== streamId) return;
      }),
    );

    const raw = await invoke<IpcApiResponse>("send_api_request", {
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body,
      bodyType: request.bodyType,
      followRedirects: request.followRedirects,
      sslVerify: request.sslVerify,
      proxyUrl: request.proxyUrl,
      streamId,
    });
    const response = decodeIpcResponse(raw);

    // If Rust streamed, body may already be filled; prefer collected events when present.
    if (events.length > 0) {
      const text = sseEventsToBody(events);
      const body = utf8Bytes(text);
      return {
        ...response,
        body,
        size: body.length,
        contentType: response.contentType || "text/event-stream",
        sse: true,
        sseEvents: events,
      };
    }

    return {
      ...response,
      sse: isEventStreamContentType(response.contentType),
      sseEvents: events.length > 0 ? events : undefined,
    };
  } finally {
    signal?.removeEventListener("abort", onAbort);
    for (const u of unlisteners) u();
  }
}

async function sendBrowserMaybeSse(
  request: HttpRequest,
  _streamId: string,
  handlers: SseHandlers,
  signal?: AbortSignal,
): Promise<ApiResponse> {
  if (request.url === "*") {
    throw new Error(
      "OPTIONS * cannot be sent from the browser transport — use the desktop app with a Host header",
    );
  }

  const headers: Record<string, string> = {};
  for (const h of request.headers) if (h.key) headers[h.key] = h.value;

  const method = request.method.toUpperCase();
  const hasBody = request.body != null && methodAllowsRequestBody(method);

  // Mirror BrowserHttpClient / the Rust desktop transport: set Content-Type from
  // bodyType when the user didn't already set one. Every send goes through this
  // streamId-aware path (see requestService.ts), not BrowserHttpClient directly.
  const hasCt = Object.keys(headers).some((k) => k.toLowerCase() === "content-type");
  const autoCt = contentTypeForBody(request.bodyType);
  if (!hasCt && autoCt && hasBody) {
    headers["Content-Type"] = autoCt;
  }

  const res = await fetch(request.url, {
    method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: request.followRedirects ? "follow" : "manual",
    signal,
  });

  const respHeaders: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    respHeaders[key] = value;
  });
  const contentType = respHeaders["content-type"] ?? "application/octet-stream";
  const statusText = res.statusText || "Unknown";

  handlers.onMeta?.({
    status: res.status,
    statusText,
    headers: respHeaders,
    contentType,
  });

  if (!(isEventStreamContentType(contentType) && res.body)) {
    const bytes = new Uint8Array(await res.arrayBuffer());
    return {
      status: res.status,
      statusText,
      headers: respHeaders,
      body: bytes,
      contentType,
      responseTime: 0,
      size: bytes.length,
      resolvedUrl: request.url,
    };
  }

  const parser = new SseParser();
  const events: SseEvent[] = [];
  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const ev of parser.push(chunk)) {
        events.push(ev);
        handlers.onEvent?.(ev);
      }
    }
    for (const ev of parser.flush()) {
      events.push(ev);
      handlers.onEvent?.(ev);
    }
  } catch (err) {
    if (signal?.aborted) {
      // User cancelled — return what we have.
    } else {
      throw err;
    }
  }

  const text = sseEventsToBody(events);
  const body = utf8Bytes(text);
  return {
    status: res.status,
    statusText,
    headers: respHeaders,
    body,
    contentType,
    responseTime: 0,
    size: body.length,
    resolvedUrl: request.url,
    sse: true,
    sseEvents: events,
  };
}
