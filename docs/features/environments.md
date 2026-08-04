# Environments

## Overview

Named variable sets and `{{var}}` interpolation for dev/staging/prod. Persisted in `localStorage`
for **both** desktop and browser. Spec: [specs/environments-v1.md](../specs/environments-v1.md).

## Problem / job to be done

Users switch bases/tokens across environments without editing every request; production mistakes
need guardrails; missing vars must fail loudly on send.

## User stories

- As a developer, I want `{{baseUrl}}` in URLs/headers/body resolved from the active env.
- As a developer, I want globals + `$uuid`-style built-ins when env has no key.
- As a developer, I want production env visually obvious and confirm on mutating methods.
- As a developer, I want unresolved vars to block send with a clear error.

## Functional requirements

1. Env selector in header; Manage modal (`⌘⇧E`): globals + envs, CRUD, production flag, secrets UI.
2. Precedence: active env > globals > `$` random built-ins > **error** (strict on send).
3. Preview in URL bar non-strict; send strict (`UnresolvedVariablesError`).
4. Built-ins: `{{$uuid}}`, `{{$email}}`, `{{$firstName}}`, `{{$lastName}}` — regenerated per send.
5. Production: red cues (border, Send, selector); confirm on DELETE/PUT/PATCH (session skip option).
6. Duplicate env copies vars; name `<name> copy`; production flag **not** copied.
7. Persistence keys: `pg_browser_environments`, `pg_globals`, `pg_active_env`.

## Non-functional requirements

- Secret values masked in UI (plaintext at rest in v1).
- Duplicate / `$`-prefixed keys rejected inline in editor.

## Acceptance criteria

- [ ] Switch env ≤2 clicks from header; request uses new values on send.
- [ ] Unresolved token blocks send; lists all missing names.
- [ ] Production env → red indicator; mutating method prompts confirm.
- [ ] `{{` autocomplete in URL, KV values, and body inserts vars.
- [ ] Delete active env → falls back to "No environment".
- [ ] Restart app — envs/globals/active still present.

## UI

- **Header selector** — active env or "No environment"; Manage…; red when production.
- **Environment Manager** — left list (Globals + envs), right editor (name, Production checkbox,
  Set-active / Duplicate / Delete, vars KV with secret lock/eye).

## UX / interactions

- Disabled variables excluded from interpolation.
- Per-token hover preview under URL bar (or "unresolved" / "generated per send").
- `{{` autocomplete works in URL bar, header/param values, and body editor.

## Keyboard

`⌘⇧E` open Environment Manager. Autocomplete ↑/↓ Enter/Tab.

## States & edge cases

- Never leave dangling active env id after delete.
- Settings Data tab counts envs; Clear All wipes them.

## Manual test checklist

- [ ] Create env with `baseUrl`; use in URL; switch env; send both.
- [ ] Remove var; send — blocked with error.
- [ ] Mark production; PUT/DELETE confirm; "don't ask again" session.
- [ ] Globals vs env precedence.
- [ ] `$uuid` changes between sends.
- [ ] Secret lock masks value; eye reveals.
- [ ] Duplicate env; production not copied.
- [ ] Autocomplete in URL, header value, and body.

## Automation coverage

- Vitest: `lib/resolve.test.ts`.
- Playwright: `e2e/environments.spec.ts`.

## Test ids

`env-selector`, `env-option-<name>` / `env-option-none`, `env-prod-checkbox`,
`env-prod-indicator`, `env-key-<i>` / `env-value-<i>`, `send-error`, `env-token`,
`var-suggestion`.

## Key files

`store.ts`, `services/db.ts`, `lib/resolve.ts`, `components/EnvSelector.tsx`,
`components/EnvModal.tsx`, `components/VarSuggestions.tsx`, `hooks/useVarAutocomplete.ts`,
`shared/lib/template.ts`; strict errors in `core/http/services/requestService.ts`.

## Open risks

- Secrets plaintext in localStorage — product limitation v1.
- Preview vs send strictness confusion if docs outdated.
- **Fixed (2026-07-26):** hovering a `{{token}}` chip in the URL bar previously never showed the
  resolved-value preview — the transparent `url-input` and the token-overlay both sat at
  `z-[var(--z-raised)]`, but the overlay is the later DOM sibling of the same stacking context so it
  should have painted on top; the `env-token` spans (`pointer-events-auto`) now reliably receive
  `mouseenter` there. `e2e/environments.spec.ts` ("hovering a `{{token}}` in the URL shows its
  resolved value") passes 3/3 runs; long-URL caret placement, End key, and horizontal wheel
  scroll-sync are unaffected. Header/param KV values remain display-only (no hover target) by
  design — `KeyValueEditor.tsx` doesn't render token chips.
