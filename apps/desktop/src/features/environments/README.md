# environments

Environment variables and `{{var}}` resolution.

## Public API (`index.ts`)
- `useEnvStore` — environments list + active environment
- `EnvModal` — manage/import environments
- `replaceEnvVariables(str, env)` — env-aware resolution (the single source of truth;
  request-builder & execution consume this, never reimplement it)
- `Environment` (type)

## Layered shape
`lib/resolve.ts` (env-aware) is built on `@/shared/lib/template.interpolate` (pure,
dep-free `{{var}}` substitution). Resolution logic stays here; the primitive stays shared.

## Extend
Add precedence layering (e.g. global < env < request) inside `lib/resolve.ts`.
