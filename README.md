<div align="center">
  <img src="logo/mark.svg" width="96" alt="Pigeon logo" />

  <h1>Pigeon</h1>

  <p><strong>Built for Real Developers, Not Showoffs.</strong></p>

  <p>
    Focus on building. Pigeon keeps your APIs organized.<br />
    Free open-source macOS API client — no account, no cloud.
  </p>

  <p>
    <img src="https://img.shields.io/badge/license-MIT-c96442?style=flat-square" alt="MIT License" />
    <img src="https://img.shields.io/badge/platform-macOS-6A6A90?style=flat-square" alt="platform" />
    <img src="https://img.shields.io/badge/price-free_forever-72b872?style=flat-square" alt="free" />
  </p>

  <p>
    <a href="https://trypigeon.dev"><strong>trypigeon.dev</strong></a>
    ·
    <a href="https://trypigeon.dev/#download"><strong>Download for macOS</strong></a>
    ·
    <a href="https://github.com/pigeon-client/pigeon"><strong>GitHub</strong></a>
  </p>

  <p><em>macOS · Apple Silicon &amp; Intel · free forever</em></p>
</div>

---

## What is Pigeon?

Pigeon is a free, open-source desktop API client for macOS — a lighter, native alternative to
tools like Postman or Insomnia. You build and send HTTP requests, inspect responses, manage
environments, and keep collections — the same core job as any API client.

The difference is what happens **after** you hit Send. Other apps make you name every request,
pick a folder, and click Save. Pigeon does that work for you:

- **Tabs name themselves** from the URL path (rename once and your name locks in)
- **Requests file themselves** into a tidy tree by domain and endpoint
- **History writes itself**, with a snapshot of the response so you can reopen without re-sending
- **⌘K finds anything** — history, drafts, and collections in one query

**Send it. It sorts itself.** Everything lives on your disk. There’s no account wall, no workspace
invite, and nothing syncs to anyone’s cloud — built for developers who want speed and privacy
without the housekeeping.

---

## Highlights

| | |
|---|---|
| **Self-organizing workspace** | Auto-named tabs, auto-filed drafts, time-bucketed history |
| **Command palette** | One search across history, drafts, and collections |
| **Request builder** | Params, headers, body, auth (Bearer, Basic, API key) |
| **Environments** | `{{variables}}` for dev / staging / prod, with production guardrails |
| **Collections** | Nested folders when you want deliberate structure |
| **cURL & Postman** | Paste cURL to build a request; import Postman Collection v2.1; copy as cURL |
| **SSE streaming** | Live event streams with a Stop control |
| **Native engine** | Rust transport — no CORS limits; redirects, SSL, and proxy control |
| **Keyboard-first** | Send, search, save, and switch tabs without the mouse |

---

## Tech stack

| Layer | Stack |
|-------|--------|
| Desktop shell | [Tauri v2](https://tauri.app) (Rust) |
| UI | React 19, Zustand, Tailwind CSS 4 |
| HTTP | Rust `reqwest` on desktop · `fetch` in the browser/dev build |
| Data | SQLite (desktop) · localStorage (browser) |
| Marketing site | Astro on Cloudflare Workers — [trypigeon.dev](https://trypigeon.dev) |
| Monorepo | pnpm workspaces · `@pigeon/ui` · `@pigeon/brand` |

No Electron. No cloud backend. Feature specs and architecture notes live in
[`docs/`](docs/README.md).

---

## Contributing

Bugs and ideas: [open an issue](https://github.com/pigeon-client/pigeon/issues).
Patches welcome — good-first-issues are labeled.

---

## License

[MIT](LICENSE) © Pigeon contributors
