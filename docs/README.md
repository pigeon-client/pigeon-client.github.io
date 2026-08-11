# Pigeon docs

Organized product and engineering reference for the monorepo.

| Area | Path | Purpose |
|------|------|---------|
| **Features** | [`features/`](./features/README.md) | Feature-based product specs (one file per feature) |
| **Architecture** | [`architecture.md`](./architecture.md) | Code layering, module APIs, packages |
| **Design tokens** | [`tokens.md`](./tokens.md) | Color / type / radius / shadow / z-index scales |

| **Feature inventory** | [`feature-design-list.md`](./feature-design-list.md) | Design-oriented screen/surface inventory |
| **Testing** | [`testing.md`](./testing.md) | Vitest, Playwright, testids, CI |
| **Release** | [`release.md`](./release.md) | Packaging, signing, Homebrew |
| **CI / deploy** | [`ci-deploy.md`](./ci-deploy.md) | GitHub Actions + Cloudflare site deploy |
| **Launch readiness** | [`launch-readiness.md`](./launch-readiness.md) | Ship checklist |
| **Security** | [`security-audit.md`](./security-audit.md) | Security notes |
| **Specs** | [`specs/`](./specs/) | Narrow technical specs (e.g. environments v1) |
| **Marketing drafts** | [`landing-page-plan.md`](./landing-page-plan.md), [`landing-page.html`](./landing-page.html) | Landing drafts (live site is `apps/site`) |

## Start here

1. Browse the **feature list**: [`features/README.md`](./features/README.md)
2. Open the feature file that matches the code under `apps/desktop/src/features/…` (or `app/`, `core/`, `apps/site`)
3. Use [`architecture.md`](./architecture.md) for module boundaries and public APIs
4. Use [`testing.md`](./testing.md) for how to verify behavior

## Repo map

```
apps/desktop/     Tauri + React desktop API client
apps/site/        Marketing site (Astro / Cloudflare Workers)
packages/ui/      Shared UI primitives + design tokens
packages/brand/   Brand assets / helpers
docs/             All project documentation (this tree)
```

## Conventions

- **All project docs live under `docs/`** — do not add `README.md` (or other `.md`) beside source
  under `apps/*/src` or `packages/*/`.
- **Feature docs** describe user-visible behavior, acceptance criteria, edge cases, manual QA, and
  `data-testid` hooks. Prefer updating `docs/features/<name>.md` when behavior changes.
- **Architecture** (`architecture.md`) holds module public APIs and layering rules.
- Design tokens: [`tokens.md`](./tokens.md) (implementation: `packages/ui/src/styles/tokens.css`).
- Root `README.md`, `AGENTS.md`, and `CLAUDE.md` are repo entry points for GitHub / agents — not
  feature docs. Astro blog posts under `apps/site/src/content/blog/` are site content, not docs.
