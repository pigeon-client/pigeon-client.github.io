/** SSE parse helpers + detection. Spec: WHATWG HTML Living Standard § Server-sent events. */

export interface SseEvent {
  /** Event type (`event:` field); defaults to `message`. */
  event: string;
  /** Joined `data:` lines (newline-separated). */
  data: string;
  /** Optional `id:` field. */
  id?: string;
  /** Raw event block as received (for copy / debug). */
  raw: string;
}

export interface SseMeta {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  contentType: string;
}

/** True when Content-Type (or Accept) names an event stream. */
export function isEventStreamContentType(contentType: string | undefined | null): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().includes("text/event-stream");
}

/** True when the request asks for SSE via Accept. */
export function requestWantsSse(headers: { key: string; value: string }[]): boolean {
  const accept = headers.find((h) => h.key.toLowerCase() === "accept");
  return isEventStreamContentType(accept?.value);
}

/**
 * Incremental SSE parser. Feed decoded text chunks; completed events are returned
 * from `push`. Call `flush` when the stream ends to emit a trailing event without
 * a final blank line (lenient).
 */
export class SseParser {
  private buffer = "";
  private eventType = "";
  private dataLines: string[] = [];
  private lastId = "";
  private rawLines: string[] = [];

  push(chunk: string): SseEvent[] {
    this.buffer += chunk;
    const out: SseEvent[] = [];
    // Normalize CRLF → LF for line splitting; keep incomplete trailing line in buffer.
    let start = 0;
    for (;;) {
      const nl = this.buffer.indexOf("\n", start);
      if (nl === -1) break;
      let line = this.buffer.slice(start, nl);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      start = nl + 1;
      const ev = this.handleLine(line);
      if (ev) out.push(ev);
    }
    this.buffer = this.buffer.slice(start);
    return out;
  }

  flush(): SseEvent[] {
    const out: SseEvent[] = [];
    if (this.buffer.length > 0) {
      let line = this.buffer;
      if (line.endsWith("\r")) line = line.slice(0, -1);
      this.buffer = "";
      const ev = this.handleLine(line);
      if (ev) out.push(ev);
    }
    // Trailing fields without blank line → emit once.
    const trailing = this.dispatch();
    if (trailing) out.push(trailing);
    return out;
  }

  private handleLine(line: string): SseEvent | null {
    // Comment / heartbeat
    if (line.startsWith(":")) {
      this.rawLines.push(line);
      return null;
    }
    if (line === "") {
      return this.dispatch();
    }
    this.rawLines.push(line);
    const colon = line.indexOf(":");
    let field: string;
    let value: string;
    if (colon === -1) {
      field = line;
      value = "";
    } else {
      field = line.slice(0, colon);
      value = line.slice(colon + 1);
      if (value.startsWith(" ")) value = value.slice(1);
    }
    switch (field) {
      case "event":
        this.eventType = value;
        break;
      case "data":
        this.dataLines.push(value);
        break;
      case "id":
        if (!value.includes("\0")) this.lastId = value;
        break;
      case "retry":
        // Ignored — client doesn't auto-reconnect in the request panel.
        break;
      default:
        break;
    }
    return null;
  }

  private dispatch(): SseEvent | null {
    if (this.dataLines.length === 0 && !this.eventType && !this.lastId) {
      this.rawLines = [];
      return null;
    }
    // Spec: if data is empty and we only had comments, skip — but we may have event/id.
    if (this.dataLines.length === 0) {
      this.eventType = "";
      this.rawLines = [];
      return null;
    }
    const data = this.dataLines.join("\n");
    const event: SseEvent = {
      event: this.eventType || "message",
      data,
      raw: `${this.rawLines.join("\n")}\n`,
    };
    if (this.lastId) event.id = this.lastId;
    this.eventType = "";
    this.dataLines = [];
    this.rawLines = [];
    return event;
  }
}

/** Join SSE events into a readable body for history / raw view. */
export function sseEventsToBody(events: SseEvent[]): string {
  return events
    .map((e) => {
      const parts: string[] = [];
      if (e.id) parts.push(`id: ${e.id}`);
      if (e.event && e.event !== "message") parts.push(`event: ${e.event}`);
      for (const line of e.data.split("\n")) parts.push(`data: ${line}`);
      return `${parts.join("\n")}\n`;
    })
    .join("\n");
}
