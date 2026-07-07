# Pigeon Landing Page — Plan

Single-page, dark developer aesthetic, SEO-first. Primary CTA: **Download for macOS** (Linux/Windows coming soon). Secondary CTA: **Star on GitHub**.

## 1. Positioning

- **What**: Pigeon — a free, open-source, lightweight desktop API client. The fast alternative to Postman.
- **Who**: developers who test REST APIs and are tired of heavy, login-gated, cloud-synced API clients.
- **Why Pigeon**: native (Tauri/Rust) so it's small and fast, no account required, no cloud, data stays local, MIT-style open source.
- **One-liner (hero H1)**: "The lightweight open-source API client."
- **Sub**: "Build, send, and inspect HTTP requests in a fast native app. No account. No cloud. No bloat. Free forever."

## 2. User journey (page maps 1:1 to this)

| Stage | Visitor state | Section | Goal | CTA |
|---|---|---|---|---|
| 1. Awareness | "What is this?" (arrived from GitHub/search/HN) | Hero | Understand product in 5s | **Download for macOS** + Star on GitHub |
| 2. Interest | "Does it do what I need?" | Feature grid + app screenshot | See core capabilities | — |
| 3. Evaluation | "How does it compare to what I use?" | "Why Pigeon" / vs-Postman strip | Differentiate: light, local, open | — |
| 4. Trust | "Is it legit / maintained?" | Open-source section (license, repo, contribute) | Credibility via openness | View on GitHub |
| 5. Action | "OK, I'll try it" | Download section (platform cards) | Convert | **Download .dmg** (mac), Notify-me links for Linux/Win → GitHub watch releases |
| 6. Retention | "I want to follow along" | Footer | Keep a channel open | GitHub, Issues, Releases |

Every scroll depth has a reachable CTA: sticky nav keeps Download + GitHub visible at all times.

## 3. Page structure & copy

1. **Nav (sticky)** — logo, anchors (Features · Open Source · Download), GitHub star button, `Download` button.
2. **Hero** — H1 + sub (above), two CTAs, trust hints ("Free & open source · macOS (Apple Silicon & Intel) · Linux & Windows coming soon"), app screenshot below.
3. **Features (6 cards)** — grounded in actual feature docs:
   - Request builder — tabs, color-coded methods, params/auth/headers/body editors.
   - Native speed — Rust engine (reqwest), no CORS pain, redirects/SSL/proxy control.
   - Environments — `{{var}}` sets for dev/staging/prod, secrets masking, production guardrails (red border + red Send).
   - Collections, history & drafts — everything auto-saved locally, organized in folders.
   - cURL in & out — paste any `curl` command to build a request; copy any request as cURL.
   - Keyboard-first — ⌘↵ send, ⌘⇧E environments, ⌘, settings, full shortcut reference.
4. **Why Pigeon strip** — 3 columns: "No account, ever" / "Your data stays on your machine" / "~10 MB native app, not an Electron browser".
5. **Open source section** — license badge, "built in the open", contribute steps (Star → Issue → PR), embedded GitHub buttons.
6. **Download section** — 3 platform cards: macOS (active, .dmg), Linux (soon → "Watch releases"), Windows (soon → "Watch releases"). Coming-soon cards still actionable (never dead-ends).
7. **Footer** — repo, issues, releases, license, "Made with ❤ by contributors".

## 4. CTA rules (actionable, always)

- Verb-first labels: "Download for macOS", "Star on GitHub", "Watch releases", "Open an issue". No "Learn more".
- Primary CTA appears 3×: nav, hero, download section.
- Coming-soon platforms link to GitHub Releases "Watch" — an action, not a dead button.
- **Placeholders to replace before publish**: `https://github.com/YOUR_ORG/pigeon` and the `.dmg` release asset URL (marked `TODO` in HTML comments).

## 5. SEO checklist (implemented in the page)

- `<title>`: "Pigeon — Free Open-Source API Client for macOS | Lightweight Postman Alternative" (~60 chars of key terms first).
- Meta description (~155 chars), canonical URL, robots, theme-color.
- Open Graph + Twitter Card tags (og:image 1200×630 — prompt below).
- JSON-LD: `SoftwareApplication` (name, OS, price 0, license) + `FAQPage` (3 Q&As targeting "postman alternative", "is pigeon free", "open source api client").
- Semantic HTML: single `<h1>`, ordered `<h2>`s, `<header>/<main>/<section>/<footer>`, descriptive `alt` text, `aria-label`s on icon links.
- Performance = ranking: single file, system fonts, inline SVG only, no external JS, lazy-loaded screenshot.
- Target keywords: *open source API client*, *Postman alternative*, *lightweight API client mac*, *free REST client*, *curl GUI*.

## 6. Image prompts (Gemini / ChatGPT image generation)

**A. Hero app screenshot (preferred: use a real screenshot; AI fallback):**
> A sleek dark-mode desktop API client application window on macOS, floating with soft shadow on a very dark navy background. The app shows a left sidebar with collections tree, a top URL bar with a green "GET" method dropdown and a URL "https://api.example.com/users", a bright send button, tabs labeled Params, Auth, Headers, Body, and a lower panel showing pretty-printed JSON response with syntax highlighting in green, orange and blue. Minimal, modern developer-tool UI like Linear or Warp, 16:10 aspect ratio, crisp UI details, no watermark, no text artifacts.

**B. OG / social image (1200×630):**
> A wide social banner, 1200x630, very dark navy background with a subtle grid pattern. Left side: bold white text "Pigeon" with a minimal geometric origami-style pigeon logo in teal, subtitle "The open-source API client" in gray. Right side: a small tilted dark app window mock showing an HTTP request interface with a green GET label and JSON response. Modern developer-tool branding, flat design, high contrast, no photograph, no extra text.

**C. Logo mark (SVG-style, optional):**
> A minimal flat logo icon of a pigeon in profile made of clean geometric shapes, single teal color (#2dd4bf) on transparent background, origami style, facing right as if in flight, simple enough to work at 32x32 pixels, no text, no gradients, vector flat design.

## 7. Post-launch (not built now)

- Point domain, submit sitemap to Search Console, add og:image asset, swap AI screenshot for a real one, add GitHub star-count fetch (needs JS + API) if desired.
