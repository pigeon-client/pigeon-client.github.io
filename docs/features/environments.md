# Environments

Named variable sets and `{{var}}` interpolation, so you can flip between dev / staging / prod.

## UI

- **Environment Manager** modal (`⌘⇧E`): a name field + **Add** to create environments, a list of
  environments, and a key/value editor for the selected environment's variables.
- The active environment is selectable; its variables resolve in URLs, headers, and bodies.

## UX / interactions

- **Create** — type a name, Add. **Edit** — select an environment, add/rename variables.
- **Interpolation** — `{{name}}` tokens are replaced at send time from the active environment's
  variables. Unknown tokens are left intact (so a stray `{{x}}` is visible, not silently blanked).
  Whitespace inside braces is trimmed (`{{ base }}` == `{{base}}`).
- **Where it applies** — `resolveRequest` interpolates the URL, each header value, and the body
  before dispatch.

## States & edge cases

- **No active environment** → strings pass through unchanged.
- Environments are currently **in-memory** (not persisted) — same behavior in desktop and browser.
- Interpolation is pure (`shared/lib/template.ts` `interpolate`) and unit-tested.

## Keyboard

- `⌘⇧E` open the Environment Manager.

## Test ids

Opened via keyboard; the manager uses `getByText("Environment Manager")`, name field
`placeholder="Environment name…"`, and an **Add** button in E2E.

## Key files

`store.ts`, `lib/resolve.ts` (`replaceEnvVariables`), `components/EnvModal.tsx`,
`src/shared/lib/template.ts`.
