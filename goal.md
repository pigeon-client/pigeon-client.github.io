# Pigeon — Product Vision

*A fast, private, native API client for developers who are tired of bloated, cloud-locked tools.*

> **Note on intent:** Pigeon is a **personal, non-commercial project**. It is **not built for
> profit** — no paid tiers, no monetization, no fundraising. It exists to showcase what I can
> design and ship: a real, polished, production-quality developer tool built solo. This document
> is a **portfolio / personal-brand piece** — a way to demonstrate product thinking, engineering
> depth, and taste, not a business pitch.

---

## The One-Liner

Pigeon is a desktop app that lets developers build, send, and inspect API requests — like Postman
or Insomnia, but **lightweight, native, private, and yours**. No forced sign-in. No account.
No data leaving the machine. No 1GB Electron memory hog.

---

## The Problem

Every developer touches APIs daily. The tools they use to do it have gotten worse:

- **Bloated.** The market leader ships as a heavy Electron app that eats hundreds of megabytes of
  memory just to send one HTTP request.
- **Cloud-locked.** You are pushed to create an account, log in, and sync your work to someone
  else's servers before you can do basic work. Your requests — often containing secrets, tokens,
  and internal URLs — live on a vendor's cloud.
- **Paywalled.** Core features (collaboration, more environments, higher limits) sit behind
  subscriptions that scale painfully with team size.
- **Slow & distracting.** Login walls, upsell banners, telemetry, and "sign in to continue" popups
  interrupt what should be a simple, fast tool.

Developers keep asking for the same thing: *just give me a fast tool that respects my machine and
my data.*

---

## The Solution

Pigeon is that tool. A native desktop API client that starts instantly, stores everything locally,
and never asks who you are.

**Why it wins:**

| Pillar | What it means |
|--------|---------------|
| **Native & light** | Built on Rust + Tauri, not Electron. Tiny footprint, instant startup, low memory. |
| **Private by default** | Requests, history, and collections live on *your* disk. Nothing is uploaded. No account required. |
| **No CORS, real HTTP** | Requests go out through a real native networking layer, so you can hit any API without the browser's restrictions. |
| **Free & open feel** | No login wall, no upsell, no metered limits on the core workflow. |
| **Familiar** | If you've used Postman or Insomnia, Pigeon feels like home on day one. |

---

## What We Built — Features & Why

### 1. Request Builder
**What:** Compose any HTTP request — pick a method, type a URL, add query params, headers, auth,
and a body. Work across multiple tabs at once, each remembered and renamable.

**Why:** This is the core job. Developers live here. Making it fast, tabbed, and keyboard-friendly
means Pigeon replaces the tool they open fifty times a day.

### 2. Send & Inspect Responses
**What:** Fire the request and see status, timing, headers, and a formatted body — JSON, HTML,
images, and live streaming (SSE) responses all rendered cleanly.

**Why:** Sending is only half the job; understanding the answer is the other half. Clear response
rendering is what turns raw data into insight and saves debugging time.

### 3. Collections
**What:** Save requests into named collections with nested folders — an organized library of your
team's or project's API calls.

**Why:** One-off requests aren't enough. Teams need a reusable, shareable map of their APIs.
Collections turn Pigeon from a scratchpad into a knowledge base.

### 4. History & Drafts
**What:** Every request you send is logged automatically, and unsaved work is kept as a draft — so
nothing is ever lost.

**Why:** "What did I send an hour ago?" is a daily question. Automatic history removes the fear of
losing work and makes the tool feel trustworthy.

### 5. Environments & Variables
**What:** Define reusable variables like `{{base_url}}` or `{{token}}` and switch between
environments (dev, staging, production) with one click.

**Why:** Real developers hit the same endpoints across many environments. Variables kill
copy-paste errors and let one request work everywhere — a massive time-saver.

### 6. Import / Export (cURL)
**What:** Paste a `curl` command and Pigeon instantly turns it into a fully-filled request. Copy
any request back out as `curl` to share or script.

**Why:** `curl` is the universal language of APIs — it's in every doc, ticket, and Slack thread.
Frictionless round-tripping meets developers where they already are and lowers the switch cost to
near zero.

### 7. Themes & Settings
**What:** Light and dark themes, plus control over request behavior — redirects, SSL verification,
and proxy support.

**Why:** Developers spend hours in this tool. Comfort (themes) and control (network options) make
it a place they *want* to work, and cover the real-world edge cases pro users demand.

### 8. Auto-Update
**What:** The app checks for and installs updates itself, securely and signed.

**Why:** Native desktop apps usually go stale. Built-in updates mean every user stays current with
no effort — critical for shipping fast and keeping the product healthy.

### 9. MCP Testing Tools *(new)*
**What:** Test and drive **MCP (Model Context Protocol) servers** directly inside Pigeon — connect
to an MCP server, list its tools and resources, call a tool with real arguments, and inspect the
response, right alongside your normal HTTP requests.

**Why:** MCP is fast becoming the standard way AI agents talk to tools and data. Developers
building for the AI era need a way to poke, debug, and verify their MCP servers — and today
there's no comfortable native tool for it. Pigeon meets the new wave of AI-tooling developers
exactly where the ecosystem is heading, and shows the product isn't stuck in the old HTTP-only
world.

### 10. Mail / Email Testing *(new)*
**What:** Send and inspect email straight from Pigeon — fire a test message, check delivery,
and view the raw content and headers — so email flows can be verified in the same tool as your
APIs. Includes **Auto Draft**: Pigeon pre-fills a ready-to-send draft (recipient, subject, body)
from your request context, so you can test an email in one click instead of building it by hand.

**Why:** Email is one of the most common things an API triggers — signups, resets, receipts,
notifications — yet it's usually the hardest thing to test. Bringing email into the same workspace
closes a real gap, and **Auto Draft** removes the busywork — no retyping the same test message —
making Pigeon a one-stop bench for the whole request-to-side-effect flow.

---

## What's Next — Roadmap

The core is built. The vision points beyond a plain HTTP client toward a **complete developer
bench for the modern, AI-connected stack:**

- **Deeper MCP support** — save MCP sessions into collections, chain tool calls, and snapshot
  responses, so MCP servers get the same first-class treatment HTTP requests have today.
- **Richer email testing** — templates, attachments, and inbox capture so full email flows can be
  verified end-to-end.
- **GraphQL & WebSocket** — extend beyond REST to the other protocols developers live in.
- **Request scripting & tests** — lightweight pre/post scripts and assertions to turn saved
  requests into repeatable checks.
- **Shared, local-first sync** — let a team share collections and environments *without* handing
  their data to anyone's cloud.

Each step reinforces the same identity: **fast, private, native, and ahead of where the tools are
going.**

---

## Who It's For

- **Individual developers** who want a fast, private tool without a login.
- **Backend & API teams** who need shared collections and consistent environments.
- **Privacy- and security-conscious orgs** who can't send internal endpoints and secrets to a
  third-party cloud.

---

## Why Now

- The dominant player has alienated its base by pushing cloud accounts and removing the beloved
  lightweight, offline experience.
- Rust + Tauri has matured into a production-grade way to ship small, fast, secure native apps —
  a real technical edge over the Electron incumbents.
- Developer trust in "your data stays yours" is at an all-time high after years of cloud lock-in
  fatigue.

There is a clear, angry, underserved audience actively looking for exactly this.

---

## Why This Project (Not for Profit)

Pigeon is **free and non-commercial** — there is no business model, no paid tier, and no intent to
make money from it. It is built for a different return: **to prove what I can do.**

- **A portfolio centerpiece.** Anyone can list "React, Rust, Tauri" on a résumé. Pigeon is the
  proof — a real, installable, polished product that solves a real problem end to end.
- **Demonstrated range.** Product thinking (what to build and why), design (a clean native UI),
  engineering (Rust backend, cross-platform desktop), and shipping discipline (CI, auto-update,
  releases) — all in one artifact.
- **On the frontier.** The MCP testing tools show I'm not just rebuilding yesterday's app; I'm
  building for where developer tooling is actually going.
- **Genuinely useful.** It's a real tool people can use for free — the best kind of PR is work
  that helps someone, not a slide deck.

The goal isn't revenue. It's a piece of work strong enough to speak for itself.

---

## The Vision

Take Pigeon from "a great API client" to a **complete, private, native developer bench** — HTTP,
MCP, email, and more, all in one fast local tool that never ships your data to anyone's cloud.

Built solo. Built to last. Built to show what one focused developer can ship.

*Local-first. Developer-first. Portfolio-grade.*
