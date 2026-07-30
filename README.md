<div align="center">
  <img src="logo/mark.svg" width="96" alt="Pigeon logo" />

  <h1>Pigeon</h1>

  <p><strong>Never save a request again.</strong><br/>
  Pigeon names, files, and remembers every request automatically — and finds any of them in
  3 keystrokes. Local, private, no account.</p>

  <p>
    <img src="https://img.shields.io/badge/license-MIT-c96442?style=flat-square" alt="MIT License" />
    <img src="https://img.shields.io/badge/platform-macOS-6A6A90?style=flat-square" alt="platform" />
    <img src="https://img.shields.io/badge/price-free_forever-72b872?style=flat-square" alt="free" />
  </p>

  <a href="https://github.com/pigeon-client/pigeon/releases/latest"><strong>Download for macOS →</strong></a>
</div>

---

## What is Pigeon?

Pigeon is a desktop API client — like Postman or Insomnia, but lighter, native, and
self-organizing. You send HTTP requests and inspect responses; Pigeon handles the filing.

The difference is what happens **after** you hit Send. Other clients make you name every
request, pick a folder, and click "Save." Pigeon does that work for you:

- **Tabs name themselves** from the URL path, and follow it as you type. Rename one by hand and
  your name locks in.
- **Requests file themselves** — every send is auto-saved and dropped into a tidy tree, one folder
  per domain, grouped by endpoint. No "Save as…" dialog, ever.
- **History writes itself** — a time-bucketed log (Today, Yesterday, This Week) of everything you
  sent, with method, name, and status — including a snapshot of the response, so reopening an old
  request shows you what it returned without sending it again.
- **⌘⇧K finds anything** — one query across history, drafts, and every collection at once. Type a
  few letters of a URL, name, or even a past response body and jump straight to it.

Everything lives on your machine. There's no sign-up, no workspace invite, and nothing syncs to
anyone's cloud.

---

## Features

| | |
|---|---|
| **Self-organizing workspace** | Auto-named tabs, auto-filed drafts, and an auto-written history — zero manual housekeeping |
| **⌘⇧K command palette** | One query across history, drafts, and every collection — ranked, with response-body search |
| **Request builder** | Params, headers, body (JSON, form-data, multipart, file), and auth (Bearer, Basic, API Key) |
| **Environments** | `{{variable}}` sets for dev / staging / prod, with secret masking and red production guardrails |
| **Collections** | Curate requests into nested folders when you want deliberate structure — stored locally |
| **cURL in & out** | Paste any `curl` command to build a request instantly; copy any request back out as cURL |
| **SSE streaming** | Live event streams render as they arrive, newest on top, with a Stop control |
| **MCP bench** | Connect to an MCP server, list its tools/resources, call one, inspect the result — no separate client |
| **Native speed** | A Rust engine sends the request — no CORS limits, full control over redirects, SSL, and proxies |
| **Syntax-highlighted responses** | Pretty-printed JSON/XML/HTML with per-theme colors; Raw mode for plain text |
| **Keyboard-first** | Send, search, save, switch tabs, and manage environments without touching the mouse |
| **Themes** | Dark and Light, persisted across sessions |
| **Auto-updates** | Checks for new releases on launch |

---

## Install

**macOS (Apple Silicon & Intel)** — one command:

```bash
curl -fsSL https://pigeon-client.github.io/install.sh | sh
```

Or grab the `.dmg` from the [latest release](https://github.com/pigeon-client/pigeon/releases/latest).

Or via Homebrew, once the tap is published (see `docs/release.md`):

```bash
brew tap pigeon-client/pigeon
brew install --cask pigeon
```

> **Linux & Windows** builds (`.AppImage`/`.deb`, `.exe`) are produced by CI on every release —
> see [Releases](https://github.com/pigeon-client/pigeon/releases) — but macOS is the primary,
> most-tested target today.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘ N` | New tab |
| `⌘ W` | Close tab |
| `⌘ Enter` | Send request |
| `⌘ K` | Open command palette |
| `⌘ F` | Focus sidebar search |
| `⌘ S` | Save to collection |
| `⌘ ,` | Open settings |
| `⌘ ⇧ E` | Open environment manager |
| `⌘ ⇧ 1–9` | Switch to tab by number |
| `?` | Show all shortcuts |

---

## How it's built

Pigeon is a Tauri v2 (Rust) + React 19 desktop app — no Electron, no cloud backend. A few notes
for the curious:

- **PM-style feature docs.** Every feature — request builder, environments, command palette, MCP
  bench, and more — has a written spec in [`docs/features/`](docs/features/README.md): problem,
  functional requirements, acceptance criteria, edge cases, and the exact `data-testid`s used to
  test it. It's the same shape a PM/eng pair would use to scope real work, kept honest against the
  actual code as it changes.
- **A dedicated QA agent.** [`.claude/agents/feature-qa.md`](.claude/agents/feature-qa.md) runs
  Vitest + Playwright, does manual exploratory passes against the feature docs' checklists, files
  bugs with repro steps, and updates the docs when behavior drifts from what's written.
- **Real transport ports, real tests.** HTTP (`features/execution`) and MCP
  (`features/mcp`) both go through a small transport interface — Tauri's Rust `reqwest` on
  desktop, `fetch` in the browser build — so the same request/response and JSON-RPC logic is unit
  tested without a live server, and Playwright can stub the network deterministically in CI.

## Contributing

Pigeon is built in the open and welcomes contributions. Found a bug or want a feature? Open an
[issue](https://github.com/pigeon-client/pigeon/issues). Want to send a patch? Good-first-issues are
labeled. Build and workflow details for contributors live in [`CLAUDE.md`](CLAUDE.md).

---

## License

[MIT](LICENSE) © Pigeon contributors
