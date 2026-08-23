---
title: "How Pigeon files every request by domain"
description: "Learn how Pigeon auto-files every API request under the host — api.stripe.com, localhost, and more. No Save dialog. A local-first Postman alternative for macOS."
seoTitle: "How Pigeon Files API Requests by Domain | Free Postman Alternative"
pubDate: 2026-08-09
heroImage: /blog/filed-by-domain.webp
heroImageAlt: "Modern History sidebar with api.stripe.com selected, plus api.github.com, localhost:3000, and staging.myapp.dev."
---

In most API clients, sending a request is step one. Then you rename the tab. Then you pick a folder. Then you remember to hit Save — if you remember at all.

Pigeon does the filing while you work.

## What happens when you send

1. Type a URL and hit send.
2. The tab picks up the path as its name (unless you already renamed it — then it stays put).
3. History lands under the **domain**, not a long list of timestamps.

So a morning of work might look like this in the sidebar:

- `api.stripe.com` — `/v1/charges`, `/v1/customers`
- `api.github.com` — `/repos/.../pulls`
- `jsonplaceholder.typicode.com` — quick test calls
- `localhost:3000` — whatever you're building locally

Same hosts you already think in. No extra folders to invent.

## Why by domain?

When something breaks, you usually hunt by host: staging vs production, Stripe vs your own API, local vs the box in the cloud. Filing history that way matches how you look for things.

Want a hand-built tree? Collections are still there — save with `⌘S` when you mean it. History is the automatic layer. Always on. Always local.

Send three requests to different hosts — say Stripe, GitHub, and `localhost`. Watch the sidebar sort itself.
