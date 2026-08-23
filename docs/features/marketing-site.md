# Marketing site

## Overview

Public site at [trypigeon.dev](https://trypigeon.dev): Astro on Cloudflare Workers (`apps/site`).
Landing page + blog. Not part of the desktop feature modules; documented here so product and
design stay aligned with the app.

**Story & copy rules:** [marketing-page-story.md](../marketing-page-story.md) — how we build the
page as a scroll narrative (not a feature spec). Read before adding sections or copy.

## Problem / job to be done

Visitors need a clear brand story, proof the product is real, and a one-command or DMG download —
without an account wall. They should **watch the story scroll**, not read a manual.

## User stories

- As a visitor, I want to understand Pigeon in one viewport and download for macOS.
- As a visitor, I want install copy (`curl … \| sh`) with a one-click copy control.
- As a reader, I want a blog for product notes.

## Functional requirements

1. **Home** (`pages/index.astro`): header, hero + animated demo, stats band,
   features, organize, why, open source, download, footer.
2. **Hero demo** (`useHeroDemo` / `heroDemoSteps`) steps through a fake request/response that
   mimics app UI — keep in sync when app chrome changes.
3. **Download** (`DownloadSection`, `parseRelease` / GitHub release assets): platform buttons;
   stub `release.json` fallback when assets missing.
4. **Blog**: `pages/blog/index.astro`, `pages/blog/[slug].astro`, content collections.
5. **Worker**: `worker.ts` serves the Astro output on Cloudflare.
6. FAQ JSON-LD on the home page for SEO.

## Non-functional requirements

- Mobile / tablet / desktop breakpoints (≈360 / 768 / 1440).
- Scroll-reveal hooks (`useScrollReveal`, `useInViewPlay`) must respect reduced motion.

## Acceptance criteria

- [ ] Home loads with brand-forward hero (product name is hero-level, not nav-only).
- [ ] Download section shows macOS targets when release assets exist; degrades on stub.
- [ ] Install command copy button works.
- [ ] Blog index + post render.
- [ ] 404 page renders.

## UI

Sections (`index.astro` composition):

| Section | Component | Purpose |
|---------|-----------|---------|
| Header | `Header.tsx` | Nav + GitHub + download CTA |
| Hero | `HeroSection.tsx` | Brand, headline, CTA, animated demo |
| Stats | `StatsBand.tsx` | Social proof counts |
| Features | `FeaturesSection.tsx` | Product capabilities |
| Organize | `OrganizeSection.tsx` | Collections / history story |
| Why | `WhySection.tsx` | Positioning |
| Open source | `OpenSourceSection.tsx` | License / contribute |
| Download | `DownloadSection.tsx` | Assets + install |
| Footer | `Footer.tsx` | Links + install one-liner |

There is **no** dedicated MCP screenshot section on the current home page.

## UX / interactions

- Hero demo autoplays when in view; pause/reset per hook behavior.
- CopyButton feedback on install command.

## Keyboard

Standard web focus order; no app-specific chords.

## States & edge cases

- Empty/missing GitHub assets → buttons hide or disable per `DownloadSection` logic.
- Blog with zero posts → empty index handled by Astro content config.

## Manual test checklist

- [ ] Desktop + mobile pass on home.
- [ ] Download links resolve for aarch64 / x64 when published.
- [ ] Copy install command.
- [ ] Open a blog post; back to index.
- [ ] Compare hero demo chrome to current desktop app (spot-check after redesigns).

## Automation coverage

- Site has its own build (`pnpm` filters / `apps/site`); desktop e2e ignores `apps/site/**`.

## Test ids

Marketing site does not share desktop `data-testid` conventions; prefer role/text in any future
site e2e.

## Key files

- `apps/site/src/pages/index.astro`
- `apps/site/src/components/*Section.tsx`
- `apps/site/src/pages/**`
- `apps/site/src/worker.ts`
- `apps/site/src/lib/github.ts`, `heroDemoSteps.ts`
- `apps/site/src/release.json` (stub)

## Open risks

- Hero demo drift vs desktop redesign.
- FAQ still mentions cURL import only — consider Postman when marketing copy is refreshed.
