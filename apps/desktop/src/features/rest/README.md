# rest

Groups the REST workspace's features — each is a standalone feature with its own
`components/ hooks/ lib/ services/ store.ts types.ts index.ts README.md` skeleton and barrel;
this directory is a grouping, not a feature itself (no `index.ts` here).

- `request-builder` — workspace tabs, request-editing UI, send trigger
- `response-viewer` — renders an `ApiResponse`
- `collections` — folder/request tree, CRUD
- `history` — persisted history + drafts
- `import-export` — cURL import/export

Cross-feature imports between these five go through each one's own barrel
(`@/features/rest/<name>`), same as any other feature.
