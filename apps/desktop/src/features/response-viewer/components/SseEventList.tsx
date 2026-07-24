import { CircleStop } from "lucide-react";
import { useEffect, useRef } from "react";
import type { SseEvent } from "@/features/execution/lib/sse";

const eventKeys = new WeakMap<SseEvent, string>();
let nextEventKey = 1;

function getEventKey(event: SseEvent): string {
  const existing = eventKeys.get(event);
  if (existing) return existing;
  const key = `sse-event-${nextEventKey++}`;
  eventKeys.set(event, key);
  return key;
}

export function SseEventList({
  events,
  active,
  onStop,
  wordWrap,
}: {
  events: SseEvent[];
  active: boolean;
  onStop?: () => void;
  wordWrap: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const stickTop = useRef(true);
  const prevLen = useRef(0);

  // Newest-first: keep viewport pinned to top while streaming unless user scrolled down.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      stickTop.current = el.scrollTop < 24;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (events.length > prevLen.current && stickTop.current) {
      el.scrollTop = 0;
    }
    prevLen.current = events.length;
  }, [events.length]);

  // Chronological store (oldest → newest); display newest first.
  const newestFirst = events.length === 0 ? [] : [...events].reverse();

  return (
    <div
      data-testid="response-sse"
      style={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: active ? "var(--status-2xx)" : "var(--text-secondary)",
            boxShadow: active
              ? "0 0 8px color-mix(in srgb, var(--status-2xx) 60%, transparent)"
              : undefined,
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", flex: 1 }}>
          {active
            ? `Streaming… ${events.length} event${events.length === 1 ? "" : "s"}`
            : `${events.length} event${events.length === 1 ? "" : "s"}`}
        </span>
        {active && onStop && (
          <button
            type="button"
            data-testid="response-sse-stop"
            onClick={onStop}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              height: 24,
              padding: "0 8px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontFamily: "inherit",
              fontSize: "var(--text-xs)",
              cursor: "pointer",
            }}
            className="hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
          >
            <CircleStop size={12} />
            Stop
          </button>
        )}
      </div>

      {events.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-secondary)",
            fontSize: "var(--text-xs)",
            padding: 24,
          }}
        >
          {active ? "Waiting for events…" : "No events received"}
        </div>
      ) : (
        <div ref={listRef} style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
          {newestFirst.map((ev, revIdx) => {
            const chronoIdx = events.length - 1 - revIdx;
            return (
              <div
                key={getEventKey(ev)}
                data-testid={`response-sse-event-${chronoIdx}`}
                style={{
                  padding: "12px 16px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginBottom: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-2xs)",
                      fontWeight: 600,
                      color: "var(--primary)",
                      background: "color-mix(in srgb, var(--primary) 14%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--primary) 28%, transparent)",
                      padding: "2px 7px",
                      borderRadius: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    {ev.event}
                  </span>
                  {ev.id != null && ev.id !== "" && (
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "var(--text-2xs)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      id:{ev.id}
                    </span>
                  )}
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--text-2xs)",
                      color: "var(--text-placeholder)",
                      marginLeft: "auto",
                    }}
                  >
                    #{chronoIdx + 1}
                  </span>
                </div>
                <pre
                  style={{
                    margin: 0,
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-xs)",
                    lineHeight: 1.55,
                    color: "var(--text-primary)",
                    whiteSpace: wordWrap ? "pre-wrap" : "pre",
                    wordBreak: wordWrap ? "break-word" : "normal",
                    overflowX: wordWrap ? undefined : "auto",
                  }}
                >
                  {ev.data}
                </pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
