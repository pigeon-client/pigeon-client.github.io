---
title: "Watching SSE streams live"
description: "Open text/event-stream endpoints in Pigeon and watch SSE events arrive live. Newest on top, Stop anytime. Free open-source macOS API client."
seoTitle: "SSE Streaming in Pigeon API Client | Watch Events Live"
pubDate: 2026-08-15
heroImage: /blog/watching-sse-streams-live.png
heroImageAlt: "Live SSE event stream panel with tick events arriving in a dark response viewer."
---

Some endpoints don't return once. They stream. Chat tokens, job progress, webhook-style ticks — `text/event-stream` and a connection that stays open.

Pigeon renders SSE as it arrives. Events show up live. Newest on top so you see what just happened without scrolling through history.

## Stop when you're done

Hit Stop and the stream closes. No orphaned connection hanging in the background while you jump to another tab.

## Good for

- Checking that your server actually emits what you think it emits
- Debugging event order without a separate viewer
- Demo-ing a live endpoint without leaving the client

Same send button. Stream-aware response pane.
