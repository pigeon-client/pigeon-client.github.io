---
title: "How Pigeon files every request by domain"
description: "No Save dialog. No empty Untitled tabs. Send a request and Pigeon names the tab and files history under the host — automatically."
pubDate: 2026-08-09
---

Most API clients treat organization as homework. You send a request, then you rename the tab, then you drag it into a folder, then you remember to save.

Pigeon flips that.

## Send first, organize for free

1. Type a URL and hit send.
2. The tab name becomes the path (or stays locked if you renamed it).
3. History groups under the **domain** — `api.example.com`, not a flat dump of timestamps.

You keep momentum. Pigeon keeps the paper trail.

## Why domain grouping

When you debug, you think in hosts: staging vs production, Stripe vs your own API. Filing by domain matches that mental model without another taxonomy to maintain.

Collections still exist when you want a deliberate tree. History is the automatic layer — always on, always local.

## Try it

```bash
curl -fsSL https://trypigeon.dev/install.sh | sh
```

Send three requests to different hosts. Watch the sidebar fill itself.
