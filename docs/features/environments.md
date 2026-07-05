# Environments

Named variable sets and `{{var}}` interpolation, so you can flip between dev / staging / prod.
Persisted, with a header switcher, globals, random built-ins, production guardrails, and **strict**
resolution. (Implements [specs/environments-v1.md](../specs/environments-v1.md).)

## UI

- **Header selector** (`EnvSelector`, near Copy-as-cURL) — shows the active env or "No environment";
  the dropdown lists every env + "No environment" + "Manage environments…". Turns **red** when a
  production env is active.
- **Environment Manager** modal (`⌘⇧E` or "Manage…"): left list (Globals pinned + envs), right editor
  with the env name, **Production** checkbox, Set-active / Duplicate / Delete, and a variable editor
  (checkbox / key / value / secret lock+eye / trash, auto blank trailing row).
- **Production cues** — a persistent red inset border around the request-builder panel and a red
  Send button while a production env is active.

## UX / interactions

- **Persistence (R1)** — environments survive restart. Stored in `localStorage`
  (`pg_browser_environments`) in **both** the desktop app and browser build — the Tauri webview's
  localStorage persists across restarts, so no SQLite/Rust command is needed. Active env id →
  `pg_active_env`; globals → `pg_globals`. Data tab in Settings counts environments; "Clear All"
  wipes them.
- **Switch** — pick an env from the header selector (≤2 clicks from anywhere).
- **Variables** — key/value rows; **secret** vars mask the value (`•••`, eye reveals/re-masks —
  display-only, stored plaintext in v1). Duplicate keys and `$`-prefixed keys are rejected inline.
- **Precedence (R7)** — active env > globals > `$`-random built-ins > **error**.
- **Strict interpolation (R3b) — behavior change.** An unresolved `{{var}}` at send time **blocks
  the send** (no request dispatched) and surfaces `Unresolved variable: <name>` (all missing names
  reported together). Previously unknown tokens passed through silently.
- **Random built-ins (R8)** — `{{$uuid}}`, `{{$email}}`, `{{$firstName}}`, `{{$lastName}}`,
  regenerated per send; resolve in URL, headers, and body.
- **Production guardrails (R4b)** — sending DELETE / PUT / PATCH against a production env prompts a
  confirm (with a "don't ask again this session" escape hatch).
- **Duplicate (R5)** — copies variables; name becomes `<name> copy`; the production flag is **not**
  copied.

## States & edge cases

- Deleting the active env falls back to "No environment" (never a dangling id).
- Disabled variables are excluded from interpolation (like disabled params).
- Preview in the URL bar is non-strict (leaves unknown tokens intact); only send is strict.
- **Per-token hover preview** — hovering a `{{token}}` in the URL bar shows its resolved value on the
  line below (or "unresolved" in red; `$`-built-ins show "generated per send").
- **`{{` autocomplete** — typing `{{` in the URL bar opens a dropdown of insertable variables (active
  env > globals > `$`-built-ins), filter as you type, ↑/↓ + Enter/Tab to insert (`var-suggestion`).

## Keyboard

- `⌘⇧E` open the Environment Manager.

## Test ids

`env-selector`, `env-option-<name>` / `env-option-none`, `env-prod-checkbox`,
`env-prod-indicator`, `env-key-<i>` / `env-value-<i>`, `send-error`, `env-token`.

## Key files

`store.ts`, `services/db.ts`, `lib/resolve.ts` (`makeResolver`, `resolveForPreview`),
`components/EnvSelector.tsx`, `components/EnvModal.tsx`, `types.ts`;
`src/shared/lib/template.ts` (`resolveTemplate`, `randomBuiltin`);
strict errors in `execution/services/requestService.ts` (`UnresolvedVariablesError`).
