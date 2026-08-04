# core/interpolation

`{{var}}` string interpolation, resolver-agnostic. Every `UnresolvedVariablesError` in the app is
this one class — MCP and `core/http` both throw it, so callers can do a single `instanceof` check
regardless of which send path failed.

## Public API (`index.ts`)
- `interpolateStrict(str, resolve)` — single string, throws immediately on any unresolved token
- `createAccumulatingResolver(resolve)` — returns `{ sub, missing }`; for callers that interpolate
  several fields (url, headers, body) and need to collect every missing variable before deciding
  whether to block the send, instead of failing on the first one
- `UnresolvedVariablesError` — `{ variables: string[] }`
- `Resolver` (type) — `(name: string) => string | undefined`

## Why resolver-agnostic
This module takes a plain `Resolver` function, not `Environment`/`EnvVariable`/`makeResolver`
directly — that would require importing `@/features/environments`, which `core` is not allowed to
do (see the layer rule in the repo's `CLAUDE.md`). Callers build the resolver themselves (typically
via `makeResolver(activeEnv, globals)` from `@/features/environments`) and pass it in.

## Consumes
`@/shared/lib/template.ts` (`resolveTemplate`, the underlying pure `{{var}}` substitution). Nothing
else — no feature imports.

## Extend
New interpolation call sites should use `interpolateStrict` (single field) or
`createAccumulatingResolver` (multiple fields, one combined error) rather than hand-rolling a third
resolver-tracking pattern.
