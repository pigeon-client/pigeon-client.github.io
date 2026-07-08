# shared

Code used by 2+ features. If something is used by only one feature, it belongs in that
feature — not here.

- `ui/` — shadcn primitives + `badge`, `tabs-shim`, `HighlightedHtml`, `Modal`
- `lib/utils.ts` — `cn`
- `lib/url.ts` — URL parsing/normalization (execution, request-builder, history, app)
- `lib/template.ts` — pure `{{var}}` `interpolate` + `parseEnvString` (no deps)
- `types.ts` — core request-shaping types (`RequestConfig`, `Header`, `KeyValue`, …)

## Note
`lib/template.ts` currently has a single consumer (`environments`). It stays here
deliberately: it's a dep-free primitive that env resolution layers on top of (see
architecture rule 3), and is the natural home for any future `{{var}}` use.
