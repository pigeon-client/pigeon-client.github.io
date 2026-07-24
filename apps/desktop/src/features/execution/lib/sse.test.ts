import { describe, expect, it } from "vitest";
import { isEventStreamContentType, SseParser, sseEventsToBody } from "./sse";

describe("SseParser", () => {
  it("parses a simple data event", () => {
    const p = new SseParser();
    const events = p.push("data: hello\n\n");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ event: "message", data: "hello" });
  });

  it("joins multi-line data and custom event type", () => {
    const p = new SseParser();
    const events = p.push("event: ping\ndata: a\ndata: b\nid: 7\n\n");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ event: "ping", data: "a\nb", id: "7" });
  });

  it("handles chunked input across pushes", () => {
    const p = new SseParser();
    expect(p.push("data: hel")).toHaveLength(0);
    expect(p.push("lo\n\n")).toEqual([
      expect.objectContaining({ event: "message", data: "hello" }),
    ]);
  });

  it("ignores comment heartbeats", () => {
    const p = new SseParser();
    expect(p.push(": keep-alive\n\n")).toHaveLength(0);
  });

  it("sseEventsToBody round-trips fields", () => {
    const text = sseEventsToBody([
      { event: "ping", data: "x", id: "1", raw: "" },
      { event: "message", data: "y", raw: "" },
    ]);
    expect(text).toContain("id: 1");
    expect(text).toContain("event: ping");
    expect(text).toContain("data: x");
    expect(text).toContain("data: y");
  });
});

describe("isEventStreamContentType", () => {
  it("detects text/event-stream", () => {
    expect(isEventStreamContentType("text/event-stream")).toBe(true);
    expect(isEventStreamContentType("text/event-stream; charset=utf-8")).toBe(true);
    expect(isEventStreamContentType("application/json")).toBe(false);
  });
});
