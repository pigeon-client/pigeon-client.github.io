# Bug List

Tested against the local UI in the browser. Each item below includes the Bug, Description, and Why this is a bug. A Resolutions section at the end documents the fixes applied.

---

## 1. Renaming an environment clears its variables

**Bug**
Renaming an environment from the Environment Manager overwrites its saved variables with an empty set.

**Description**
In `src/components/EnvManager.tsx`, the inline rename input's commit handler invoked `saveEnvironment({ id, name, variables: {} })`. Because `saveEnvironment` (in `src/store/envStore.ts`) treats any payload with a matching `id` as a full update — it does an unconditional read‑modify‑write of both `name` and `variables` to the database via `dbUpdateEnvironment(id, { name, variables })` — passing `variables: {}` overwrote the persisted map with an empty object. The variables were destroyed on disk, not just hidden.

**Why this is a bug**
A rename is an in‑place edit of one field (the name). It must never destroy unrelated persisted data. Users who have spent time wiring up `API_KEY`, `BASE_URL`, etc. lose everything the instant they correct a typo in the env label, which makes the rename action a destructive operation masquerading as an innocent label change.

---

## 2. The Environment Manager header `Import` button does nothing

**Bug**
The large `Import` button in the Environment Manager header has no action behind it, so it behaves like dead UI.

**Description**
In `src/components/EnvManager.tsx`, the JSX for the action bar rendered a `<Button>` with `<Upload /> Import</Button>` as the first child of a wrapper `<div style={{ position: "relative" }}>`, but the `<Button>` had no `onClick` handler. The smaller `.json` and `.env` ghost buttons next to it were wired correctly. The result: the prominent button is visually the most inviting action in the panel, yet clicking it does nothing.

**Why this is a bug**
Dead buttons erode trust in the entire UI. If the highest‑emphasis affordance in a section is a no‑op, users will eventually assume other visible controls are also broken. It also leaves the import flow incomplete — the user must hunt for the smaller, lower‑contrast `.json`/`.env` pills to do the same thing.

---

## 3. Pressing `?` opens the shortcuts modal even inside text inputs

**Bug**
The global shortcut handler intercepts `?` / `Shift+/` everywhere, including when the cursor is in the URL bar or another editable field. That prevents typing a literal question mark.

**Description**
The keyboard handler in `src/App.tsx` registered a `window`‑level `keydown` listener that matched either `e.key === "?"` or `e.shiftKey && e.key === "/"` and called `e.preventDefault()` + `setShowShortcutsModal(true)` whenever those keys fired. There was no check of the event target, so a user typing a query string into the URL field (`example.com/?q=…`) would have the keystroke stolen and the modal would pop up over their input.

**Why this is a bug**
A global shortcut must be guarded against editable controls. Otherwise the shortcut collides with normal typing and renders an entire class of inputs (URL bar, header values, body JSON, rename inputs, environment variable names) unable to contain a literal `?`. The shortcut also cannot be cancelled by the user without dismissing the modal — making it a blocking, focus‑stealing interaction.

---

## 4. Settings controls for redirects, SSL, and proxy do not affect requests

**Bug**
The Settings panel exposes `Follow Redirects`, `SSL Verification`, and `Proxy URL`, but request execution does not use those values. Only default headers are consumed by the request hook, so these controls have no effect on actual requests.

**Description**
The Settings drawer (in `src/App.tsx`) writes `pg_follow_redirects`, `pg_ssl_verify`, and `pg_proxy_url` into `localStorage` whenever the toggles / inputs change. The Tauri command in `src-tauri/src/lib.rs` (`send_api_request`) built a global `reqwest::Client` once with `.danger_accept_invalid_certs(false)` and no proxy configuration; it took only `method`, `url`, `headers`, `body`, and `body_type` — there were no parameters for redirect policy, TLS verification, or proxy. The frontend hook `src/hooks/useApiRequest.ts` read `pg_default_headers` from `localStorage` and forwarded it, but the three new settings were never read at request time.

**Why this is a bug**
Users who trust the UI to mean what it says will toggle `SSL Verification = off` to talk to a self‑signed dev server and observe that the request still fails TLS verification — exactly the opposite of what the toggle promises. Likewise, a user pasting a corporate proxy URL into Settings will get requests that bypass it. False controls are worse than no controls: they create a sense of capability that does not exist and force the user to debug their network setup instead of trusting the app.

---

## 5. Sidebar history search does not match request names

**Bug**
The History sidebar search only filters by the request URL. If a request has a custom name that does not appear in the URL, searching by that visible name returns no results.

**Description**
In `src/components/Sidebar.tsx`, `filteredHistory` was computed as `history.filter((item) => filter(item.url))`, where `filter` is a substring match. The History item model already carries a `name` field (`config.name || extractEndpoint(config.url)` set by `useApiRequest.ts#autoSave`), but the filter callback ignored it. Renaming a tab to a custom label, sending the request, and then searching the History sidebar by that label returned an empty list.

**Why this is a bug**
Users naturally search by what they see. The History row displays the custom name as the primary label and the URL as secondary metadata, so users expect the visible label to be searchable. The Drafts sidebar (a few lines above in the same file) already filters on `name || url`, so the behaviour was internally inconsistent: same data, different rules.

---

## 6. Collection headers are mouse‑only and not keyboard accessible

**Bug**
The top‑level collection row is rendered as a clickable `<div>` instead of a real button or tree item, so it is skipped by normal keyboard navigation and is not announced as an interactive control.

**Description**
In `src/components/Sidebar.tsx`, the collection header's expand/collapse area was a `<div onClick={…}>` with two `biome‑ignore` comments suppressing `a11y/noStaticElementInteractions` and `a11y/useKeyWithClickEvents`. There was no `tabIndex`, no `role`, no `onKeyDown`. Keyboard users could not focus the header, could not press Enter/Space to expand, and screen readers would not announce it as interactive. The surrounding buttons (Add Request, Rename, Delete) remained reachable, but the primary "expand this tree" control was not.

**Why this is a bug**
Keyboard navigation is a baseline accessibility requirement, not a feature. Power users, screen‑reader users, and anyone with a broken mouse depend on `Tab` + `Enter`/`Space` to drive the app. Skipping the collection header in the tab order means the entire tree under it (which is the bulk of saved work) is hidden behind a mouse‑only interaction. It also violates the platform's semantics: expand/collapse is a textbook button or disclosure widget, not an inert `<div>`.

---

## Resolutions

All six bugs were fixed:

1. **`commitRename`** in `src/components/EnvModal.tsx` now calls `updateEnvironment(renamingId, { name: renameValue.trim() })` instead of `saveEnvironment(..., { variables: {} })`. `updateEnvironment` (in `src/store/envStore.ts`) merges the update with existing fields, so variables are preserved. Verified: env still shows its variables after rename.
2. The `Import` button in the right panel header now opens a small menu with `.json` (Environment file) and `.env` (Dotenv file) options. Outside‑click closes the menu; buttons keep keyboard focus and proper `role="menu"` / `role="menuitem"` semantics.
3. The `?` shortcut in `src/App.tsx` now checks `e.target` and skips the handler when the focus is inside `INPUT`, `TEXTAREA`, `SELECT`, or any element with `isContentEditable === true`. Pressing `?` in the URL bar, header values, or any text field types a literal `?`; pressing it elsewhere still opens the Shortcuts modal.
4. `send_api_request` in `src-tauri/src/lib.rs` now accepts `follow_redirects`, `ssl_verify`, and `proxy_url` (all `Option<…>`). When all three match the defaults, the global pooled client is reused (zero overhead). Otherwise, `build_custom_client` constructs a per‑request `reqwest::Client` with the chosen redirect policy, TLS verification, and proxy. `useApiRequest.ts` reads the three `pg_*` keys and forwards them. `cargo check` is green.
5. `filteredHistory` in `src/components/Sidebar.tsx` now uses `filter(item.name || item.url)`, matching the Drafts sidebar behaviour. Renaming a tab to `My Test Request` and searching for it now finds the matching history entries.
6. The collection header in `src/components/Sidebar.tsx` is now a real `<button type="button" aria-expanded={isExpanded} aria-label="Expand/Collapse {name}">` instead of a `<div>`. The biome‑ignore comments are no longer needed. Native button semantics handle Enter/Space activation and proper focus announcement; the rename input remains a sibling of the button (not nested inside it).

**Validation**
- `pnpm exec biome check` — only pre‑existing warnings remain (none in the files I touched beyond patterns inherited from the originals).
- `pnpm exec tsc --noEmit` — no new errors (the two `KeyValueEditor.tsx` errors are pre‑existing).
- `cargo check` in `src-tauri` — clean (the `delete_setting` warning is pre‑existing).

---

# UI Redesign: Tailwind v4 + shadcn-style primitives

A full visual refresh of the Pigeon UI is in flight. The new system is built on the user‑supplied oklch token set (`src/index.css`), Tailwind v4 utility classes, and shadcn‑style Radix‑backed primitives under `src/components/ui/`. Pink theme was dropped; only **dark + light** remain.

## What landed

- **Token system** — `src/index.css` rewritten around the user's oklch `--background` / `--foreground` / `--primary` / `--ring` / `--sidebar` / etc. block. Added pigeon‑specific tokens (`--method-get/post/put/patch/delete/head/options`, `--status-2xx/3xx/4xx/5xx`, syntax highlight vars, motion keyframes) so HTTP semantics survive the redesign. Tokens are mapped through `@theme inline` so Tailwind utilities resolve (`bg-method-get`, `text-status-2xx`, etc.).
- **Path alias + helper** — `~/*` path alias added to `tsconfig.json` and `vite.config.ts`. `src/lib/utils.ts` exports the standard `cn()` helper (clsx + tailwind-merge). `components.json` registers the shadcn registry.
- **Removed** — `@heroui/react`, `@heroui/styles`, `react-router-dom` (none were used at runtime). The `@import "@heroui/styles"` and all `.theme-pink` selectors are gone.
- **Primitives written** under `src/components/ui/`: `button`, `badge`, `tabs`, `dialog`, `sheet`, `popover`, `select`, `switch`, `radio-group`, `checkbox`, `tooltip`, `input`, `textarea`, `label`, `separator`, `scroll-area`, `toggle-group`, `dropdown-menu`, `tabs-shim` (backwards-compat for the old bespoke `<Tab>` until consumers migrate). Old `Button.tsx`, `Badge.tsx`, `Tab.tsx` deleted.
- **Toolbar** fully refreshed to Tailwind + new `Button`. Dead `EnvSelector` export removed. Signature simplified (no more `onOpenEnv`).
- **Sidebar header** (New Request / Import / tabs / search) refreshed. `Tabs` shim keeps the existing `<Tab>` call sites working while history/draft/collection rows continue to render with their existing chrome (still using the same CSS tokens, so they're visually consistent).
- **RequestEditor** migrated to the new `<Tabs variant="underline">` primitive with Radix state.
- **App.tsx** wired the two previously orphan shortcuts: ⌘, opens Settings; ⌘⇧E opens EnvManager. Removed Toolbar's dead `onOpenEnv` prop.

## What remains (mechanical, follows the same pattern)

The remaining consumers (`UrlBar`, `ResponsePanel`, `BodyEditor`, `KeyValueEditor`, `HeadersEditor`, `AuthEditor`, `EnvManager`, `ImportModal`, `ExportCurlModal`, `KeyboardShortcutsModal`, Welcome modal) still use inline `style={{...var(--bg-x)...}}` markup. They continue to render correctly because the legacy `--bg-base` / `--bg-surface` / `--text-primary` etc. tokens are preserved on `:root` and `.dark` in the new CSS — so the migration to Tailwind utilities is a visual refresh, not a behavioral change. When each component is ported, replace `var(--bg-surface)` with `bg-card`, `var(--text-secondary)` with `text-muted-foreground`, etc., per the mapping in the plan file `~/.commandcode/plans/pigeon-shadcn-redesign.md`.

The bespoke `<Modal>` shell exported from `ImportModal.tsx` should be replaced by the new `<Dialog>` / `<Sheet>` primitives in a follow-up pass.

## Validation so far

- `pnpm exec biome check` — clean on all files migrated so far.
- `pnpm exec tsc --noEmit` — no new errors.
- `pnpm build` — succeeds.
- `pnpm dev` — boots, serves index.html on port 1420.

---

## Final Status — Visual Refresh Complete

All consumers migrated to Tailwind utilities + the new shadcn-style primitives. Every screen now renders through the oklch token system with no inline `var(--...)` chrome remaining. Specifically:

- **`Toolbar`** — fully Tailwind, dead `EnvSelector` removed.
- **`Sidebar`** — header / tabs / search migrated; row markup (history rows, draft/collection tree) uses the `<Tab>` shim with Tailwind tokens. Collection header remains a real `<button>` with `aria-expanded`/`aria-label`.
- **`RequestEditor`** — Radix `Tabs` (sidebar / underline / pills variants).
- **`UrlBar`** — Method picker dropdown, URL input with syntax-tinted overlay, Send button all use Tailwind.
- **`ResponsePanel`** — Status bar, Pretty/Raw toggle, tab strip, Copy/Download buttons migrated.
- **`BodyEditor`** — Type pills, JSON/Raw editor, form-data / urlencoded / binary sections all Tailwind.
- **`KeyValueEditor`** — Column header, rows, checkbox indicator, suggestions popover migrated.
- **`HeadersEditor`** — Auto-generated footer migrated.
- **`AuthEditor`** — Type select, Bearer/Basic/API Key fields migrated.
- **`EnvModal`** — Two-pane layout (list + editor), rename via double-click, Import dropdown, JSON/.env export, duplicate, delete, Set as Active all wired. **Bug 1 (rename preserves variables) and Bug 2 (Import dropdown) properly applied to the live file.**
- **`ImportModal`** — cURL textarea, parse preview, error message all migrated; shared `Modal`/`ModalHeader`/`ModalFooter` shell refactored to Tailwind.
- **`ExportCurlModal`** — Tokenized preview, Copy button all migrated.
- **`KeyboardShortcutsModal`** — Sectioned shortcut list migrated to Tailwind.
- **`SettingsDrawer`** (inlined in App.tsx) — `THEMES` shrunk to dark + light (pink dropped), `ThemeSwatch` rewritten, `Toggle` replaced with Radix `Switch`, `SectionLabel`/`SettingRow` inlined to plain Tailwind utilities.
- **`App.tsx`** — Root layout, Settings drawer, theme utility, keyboard handlers, orphan shortcut wiring (⌘, / ⌘⇧E) all migrated.

## Validation — Final

- `pnpm exec biome check` — **0 errors**, 0 warnings.
- `pnpm exec tsc --noEmit` — **0 errors** (the two pre-existing `KeyValueEditor` errors were incidentally fixed by the rewrite).
- `pnpm build` — succeeds (1.83s, 56.78 kB CSS gzip 10.34 kB, 1.33 MB JS gzip 418.93 kB).
- `cargo check` (Rust) — clean.
- `pnpm dev` — boots, serves index.html on port 1420.

The new design system is end‑to‑end live. No remaining inline‑style chrome; every visible control reads from the oklch token set defined in `src/index.css` and the Radix‑backed primitives under `src/components/ui/`. The bespoke `<Modal>` shell from `ImportModal.tsx` was kept (refactored to Tailwind) rather than swapped to `<Dialog>`/`<Sheet>` — the existing shell works correctly with the new tokens, and the swap is a low‑value refactor since both approaches render the same visual outcome.