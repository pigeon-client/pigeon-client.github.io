<div align="center">
  <img src="logo/macOS/Icon-128.png" width="96" alt="Pigeon logo" />

  <h1>Pigeon</h1>

  <p><strong>The API client that organizes itself.</strong><br/>
  Free, open-source, and native. No account, no cloud, no busywork.</p>

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
  sent, with method, name, and status.

Everything lives on your machine. There's no sign-up, no workspace invite, and nothing syncs to
anyone's cloud.

---

## Features

| | |
|---|---|
| **Self-organizing workspace** | Auto-named tabs, auto-filed drafts, and an auto-written history — zero manual housekeeping |
| **Request builder** | Params, headers, body (JSON, form-data, multipart, file), and auth (Bearer, Basic, API Key) |
| **Environments** | `{{variable}}` sets for dev / staging / prod, with secret masking and red production guardrails |
| **Collections** | Curate requests into nested folders when you want deliberate structure — stored locally |
| **cURL in & out** | Paste any `curl` command to build a request instantly; copy any request back out as cURL |
| **Native speed** | A Rust engine sends the request — no CORS limits, full control over redirects, SSL, and proxies |
| **Syntax-highlighted responses** | Pretty-printed JSON/XML/HTML with per-theme colors; Raw mode for plain text |
| **Keyboard-first** | Send, search, save, switch tabs, and manage environments without touching the mouse |
| **Themes** | Dark and Light, persisted across sessions |
| **Auto-updates** | Checks for new releases on launch |

---

## Install

**macOS (Apple Silicon & Intel)** — one command:

```bash
curl -fsSL https://raw.githubusercontent.com/pigeon-client/pigeon/main/scripts/install.sh | sh
```

Or grab the `.dmg` from the [latest release](https://github.com/pigeon-client/pigeon/releases/latest).

> **Linux & Windows** are on the roadmap.
> [Watch the releases](https://github.com/pigeon-client/pigeon/releases) to be notified.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘ N` | New tab |
| `⌘ W` | Close tab |
| `⌘ Enter` | Send request |
| `⌘ F` | Focus sidebar search |
| `⌘ S` | Save to collection |
| `⌘ ,` | Open settings |
| `⌘ ⇧ E` | Open environment manager |
| `⌘ ⇧ 1–9` | Switch to tab by number |
| `?` | Show all shortcuts |

---

## Contributing

Pigeon is built in the open and welcomes contributions. Found a bug or want a feature? Open an
[issue](https://github.com/pigeon-client/pigeon/issues). Want to send a patch? Good-first-issues are
labeled. Build and workflow details for contributors live in [`CLAUDE.md`](CLAUDE.md).

---

## License

[MIT](LICENSE) © Pigeon contributors
