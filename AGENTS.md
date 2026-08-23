# Repository Guidance

`CLAUDE.md` is canonical source for repository architecture, commands, testing, and conventions.

## Working Rules

- Keep application changes inside `apps/` and shared package changes inside `packages/`.
- Use root `pnpm` commands; keep workspace lockfile unchanged unless dependency changes require it.
- Run `pnpm test` and `pnpm build` after code changes.
- Run `pnpm ci:check` before merging; fix reported formatting or lint errors.
- Use design tokens instead of hardcoded color values (spec: `docs/tokens.md`).
- Import UI primitives only from `@pigeon/ui`. Do not import `@radix-ui/*`, `@base-ui/*`,
  or shadcn internals outside `packages/ui`.
- Keep project documentation under `docs/` only — do not add `.md` files beside source in
  `apps/*/src` or `packages/*/`.
- Biome is strict (`preset: recommended` + React/security/performance domains; `console.log` banned).
- Do not edit `biome.json` or `lefthook.yml` without explicit approval.
- Do not commit secrets, credentials, build output, or local configuration.
- Blog / marketing images: follow **Image prompts** below. Always dark mode. Always match
  `apps/site/public/blog/filed-by-domain.webp`. When the scene shows the app, also attach
  `packages/brand/assets/app-ui-reference.png` and match that chrome. Always attach the brand
  logo and use it as needed.
- Marketing copy: use **Hero copy** below for home page, OG images, and site messaging. Source of
  truth in code: `apps/site/src/lib/constants.ts`.

## Hero copy

Use this for home page hero, OG/social images, SEO, and marketing — do not invent alternate
taglines unless the user asks.

| Constant | Value |
|---|---|
| `HERO_HEADLINE` | Built for Real Developers, Not Showoffs. |
| `HERO_HEADLINE_ACCENT` | Real Developers |
| `HERO_SUB` | Focus on building. Pigeon keeps your APIs organized. |

- Render **Real Developers** in terracotta accent (`#c96442`) when the medium supports it.
- Full hero line = headline + sub. Example OG title pattern: `{HERO_HEADLINE} | Pigeon`.
- Every marketing/OG banner uses `HERO_SUB` as its sole subline, exactly as written. Do not
  substitute comparison-specific or feature-specific taglines.

## Image prompts

Use this for every generated image (blog hero, OG, product UI, marketing). Do not invent a new
style per request. Product UI in images must match the **real Pigeon app chrome** below — not a
generic Postman/Insomnia mock.

**References (attach when generating):**

1. Style: `apps/site/public/blog/filed-by-domain.webp`
2. Brand logo: `packages/brand/assets/pigeon-mark.svg` (or `icon-source.png` if raster needed)
3. Full app chrome: `packages/brand/assets/app-ui-reference.png` (canonical — match this first)
4. History sidebar: `packages/brand/assets/app-ui-history.png`
5. Collections sidebar: `packages/brand/assets/app-ui-collections.png`

When the image is marketing/OG text-forward only (no readable app chrome), attach (1) and (2).
When the image shows the API client UI, attach (1)–(3). If the subject is History or
Collections specifically, also attach (4) or (5).

When calling image generation:

- `reference_image_paths` (default product UI):
  `["apps/site/public/blog/filed-by-domain.webp", "packages/brand/assets/pigeon-mark.svg", "packages/brand/assets/app-ui-reference.png"]`
- History-focused scenes: also include `packages/brand/assets/app-ui-history.png`
- Collections-focused scenes: also include `packages/brand/assets/app-ui-collections.png`
- `aspect_ratio`: `"16:9"` (export **1600×900** WebP for blog heroes; **1600×840** for OG/meta)
- Save blog heroes to `apps/site/public/blog/{slug}.webp`
- Save OG/meta images to `apps/site/public/og/{name}.webp`

**Always dark mode.** Never light UI, never white canvas, never a different palette.

**Brand logo:** I attach an image of the brand logo. Please use as needed — app-window icon,
sidebar mark, or a small UI badge. Keep the exact silhouette and terracotta (`#c95625` /
`#c96442`). Do not redraw a different bird. Do not make the logo the hero unless the subject
is branding. If the scene does not need a logo, leave it out.

### Real UI chrome (match `app-ui-reference.png` — do not invent)

Pigeon is a native dark macOS API client. Generated UI must follow the attached real screenshot
pixel-layout and controls below — not a generic REST client.

**Top bar (left → right):**
- Terracotta pigeon mark + **Pigeon** wordmark (Inter) — logo lives here only
- Center search: placeholder **Search…**, magnifying glass, `⌘F` hint when empty (Geist Mono)
- Environment: globe icon + **No environment** (or a named env)
- Protocol tabs: **REST** (active terracotta underline) | **MCP** | **GraphQL** (`{ }` braces)
- Far right: **Settings** gear only
- **Do not show** Copy as cURL / terminal (`>_`) in generated images

**Left sidebar (shared chrome):**
- Top row, side by side: outline **+ New Request** (Plus + label, dark fill, thin border —
  **not** terracotta/primary) + square outline **Import** button (upload icon only, same
  non-primary style)
- Tabs: **History** | **Draft** | **Collections** — active = muted pill or terracotta underline
- Footer: `{n} requests · {m} drafts` + hide-sidebar icon

**Sidebar — History** (`app-ui-history.png`):
- Uppercase sections: **TODAY** / **YESTERDAY** / **THIS WEEK** / **LAST WEEK** / **OLDER**
- Row: method badge · path · status · `HH:MM` — not domain folders

**Sidebar — Draft** (domain tree when Draft is active):
- Host folders + gray count badges; expandable nested paths

**Sidebar — Collections** (`app-ui-collections.png` / often in `app-ui-reference.png`):
- Dashed **+ New Collection**; rows = chevron · folder icon · name · count badge

**Main workspace:**
- Tab strip: e.g. `GET /todos/1` + close + `+`
- **URL bar (no logo, no brand mark inside the bar):**
  - Left: method dropdown only (**GET** green `#34d399`) — separate from Send
  - Center: URL in Geist Mono (path segments may use terracotta accent)
  - Right: terracotta **Send** = single primary icon button (paper-plane) — **icon-only, no
    text label, no split/dropdown, no chevron**. Not a dual Send+menu control
- Editor tabs: **Params** | **Auth** | **Headers** | **Body** (count badge on Headers when > 0)
- Response (after send): status `● 200 OK` green · timing · size · Body/Headers · Pretty/Raw ·
  syntax-highlighted JSON (Geist Mono)
- Empty response: **Ready to send** / *Run this request to see the response here* · **Send
  request** + `⌘↵`

**Do not invent:**
- Copy as cURL / terminal icon in the header
- Terracotta/primary filled **New Request** (keep outline/neutral)
- Pigeon logo inside the URL bar
- Send as text+icon, split button, or dropdown
- History as domain folders (that is **Draft**)
- Purple accents, macOS traffic lights as focus, tab label “Drafts”

### Style lock (copy from the reference)

- Near-black charcoal canvas `#0b0c0f` (Pigeon dark `--background`)
- Slight **isometric / three-quarter** 3D view of the real Pigeon UI above — not a flat
  screenshot, not a photograph, not a centered icon on a void
- Shallow depth of field: foreground panel sharp, far UI softly blurred
- Soft light from top-left, subtle panel gradients, 8–12px rounded corners, thin low-contrast
  borders (`#23262e`)
- Surfaces: `#15181d` / `#1b1e25` panels on `#0b0c0f`
- Accent / selection: muted terracotta `#c96442` — active underlines, **Send** icon button,
  checkboxes, selected accents only (**not** New Request / Import)
- **Typography (always):**
  - **Inter** — UI chrome, sidebar labels, buttons, panel titles, marketing headline/sub on
    OG/meta banners
  - **Geist Mono** — URL bar, HTTP methods, paths, tabs, JSON, timestamps, keyboard hints
    (`⌘F`, `⌘↵`), status codes, and any code or API text. Never substitute another mono font.
- Text colors: off-white `#e8eaef`, muted gray `#8b909c`
- Quiet HTTP method colors if needed (GET `#34d399`, POST `#fbbf24`, DELETE `#f87171`)
- No people, no watermark, no neon cyberpunk, no macOS traffic-light chrome unless the window
  frame is essential, no extra logos besides the attached Pigeon mark in the title bar

### Prompt template

Change **only** `{SUBJECT}`. Keep camera, lighting, palette, chrome layout, and format identical.

> Dark-mode product illustration, 16:9, matching the attached style reference and the attached
> real Pigeon UI screenshot exactly in chrome layout, controls, camera, lighting, and materials.
> I attach an image of the brand logo; use only as the title-bar mark next to “Pigeon” — exact
> terracotta silhouette, not in the URL bar, not a giant hero logo. Near-black charcoal
> background (#0b0c0f). Slight isometric three-quarter view of the real Pigeon API client: top
> bar with pigeon mark + Pigeon, Search… + ⌘F, No environment, REST/MCP/GraphQL, Settings gear
> only (no cURL/terminal icon); left sidebar with side-by-side outline + New Request and Import
> upload icon (no primary fill), History/Draft/Collections; main pane with method dropdown +
> clean URL field (no logo) + single terracotta paper-plane Send icon button (no text, no
> dropdown), Params/Auth/Headers/Body. Inter for UI chrome; Geist Mono for URLs, methods, paths,
> JSON, keyboard hints. {SUBJECT} is the sharp focal point in the foreground; surrounding UI
> falls off with shallow depth of field. Soft light from top-left. Accents terracotta (#c96442)
> only on active underlines and Send. Off-white text, muted gray inactive. Cinematic
> developer-tool render like Linear or Warp, not a photograph, not a flat screenshot, not light
> mode. No people, no watermark, no neon.

**Subject example (default product shot — matches app-ui-reference.png):** Collections or Draft
sidebar as in the reference; open tab `GET /todos/1`; URL
`https://jsonplaceholder.typicode.com/todos/1`; Params active; response `200 OK` with JSON body —
or for site launch, same chrome with URL **https://trypigeon.dev** as the sharp focal point.

**Subject example (filed-by-domain):** **Draft** sidebar with domain folders; selected host
accent; nested paths; blurred request/response on the right.

**Subject example (History):** **History** tab; TODAY / THIS WEEK / …; method · path · status ·
time — attach `app-ui-history.png`.

**Subject example (Collections):** **Collections** tab; dashed + New Collection; folder rows —
attach `app-ui-collections.png`.

### Meta / OG prompt (home)

Use **Hero copy** above. Export **1600×840** WebP → `apps/site/public/og/home.webp`.

> Dark-mode social meta banner, 16:9, matching the attached style reference in camera, lighting,
> and materials. I attach an image of the brand logo; please use as needed — exact terracotta
> pigeon silhouette, not a different bird. Near-black charcoal background (#0b0c0f). Blurred dark
> Pigeon API-client UI in the background (real chrome: REST tab, History sidebar, URL bar, Send)
> with shallow depth of field — rounded charcoal panels, thin borders (#23262e), Inter for labels,
> Geist Mono for any visible URLs/paths/code, soft light from top-left. **Foreground focal point:**
> centered marketing layout — terracotta Pigeon mark with **Pigeon** in Inter semibold off-white
> (#e8eaef); headline **Built for** off-white, **Real Developers** in primary terracotta
> (#c96442), **, Not Showoffs.** off-white (Inter, bold, max two lines); subline in muted gray
> (#8b909c, Inter): **Focus on building. Pigeon keeps your APIs organized.** High contrast,
> readable at small OG preview. No extra slogans. No people. No watermark. No neon. Not light
> mode. Cinematic developer-tool render like Linear or Warp.

### Meta / OG prompt (postman-alternative)

Use the exact **Hero copy** subline. Export **1600×840** PNG →
`apps/site/public/og/postman-alternative.png`.

> …same style lock and blurred real Pigeon API-client background… **Foreground:** terracotta
> Pigeon mark + **Pigeon** (Inter); headline **Why choose Pigeon over** off-white, **Postman**
> terracotta (#c96442), **?** off-white (Inter, bold); subline muted gray: **Focus on building.
> Pigeon keeps your APIs organized.** Geist Mono only if showing a URL or method in the blurred UI.

### Meta / OG prompt (insomnia-alternative)

Use the exact **Hero copy** subline. Export **1600×840** WebP →
`apps/site/public/og/insomnia-alternative.webp`.

> …same style lock and blurred real Pigeon API-client background… **Foreground:** terracotta
> Pigeon mark + **Pigeon** (Inter); headline **Why choose Pigeon over** off-white, **Insomnia**
> terracotta (#c96442), **?** off-white (Inter, bold); subline muted gray: **Focus on building.
> Pigeon keeps your APIs organized.**