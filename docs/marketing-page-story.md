# Marketing page — story, not spec sheet

How we build [trypigeon.dev](https://trypigeon.dev) (`apps/site`). Read this before writing copy
or adding sections. Technical wiring lives in [features/marketing-site.md](./features/marketing-site.md);
SEO checklist in [landing-page-plan.md](./landing-page-plan.md).

---

## North star

**Visitors should scroll because something is happening — not because they are studying a manual.**

The page is a short film about a developer’s day with Pigeon. Each section is one beat: a problem
you recognize, then relief. We do not list features; we show moments.

If a section reads like release notes or a comparison chart, rewrite it.

---

## What we are not

| Don’t | Do instead |
|---|---|
| Bullet lists of capabilities | One scene + three caption beats under a demo |
| “Supports X, Y, Z” | “You pasted messy JSON. One tap. Clean.” |
| Feature matrix vs Postman | One honest line: why we went the other way |
| Long paragraphs | Headline + one lead sentence + moving demo |
| Jargon (`stripTrailingCommas`, `VarKeyValueEditor`) | What the human felt (paste → format → send) |
| “Learn more” buttons with no action | Download, Star, Install — always a verb |

Keywords and FAQs exist for search engines (meta, JSON-LD). **Face copy is story.**

---

## The scroll story (page arc)

Visitors enter mid-frustration and leave ready to install. Order matters.

```
1. HOOK     — Hero demo plays before they read. “Never save a request again.”
2. PROOF    — Stats band (optional social proof — keep tiny)
3. MAGIC    — Organize: send → auto-name → auto-file → history (our differentiator)
4. MOMENTS  — Small daily wins while editing (JS object → JSON, trailing-comma fix) — story sections
5. TOOLKIT  — Features grid: breadth, still with `.sc-story` demos + story lines
6. PHILOSOPHY — Why Pigeon: no account, local disk, native — not “vs Postman” table
7. TRUST    — Open source, MIT, GitHub
8. ACTION   — Download (third CTA)
```

**Momentum rule:** no two static text-only sections in a row. Every block has motion (hero demo,
`.org-playing`, `.card.playing`, scroll reveal) or is very short (stats band).

---

## Why not Postman (or the others)

We never name competitors in headlines. We describe the **weight they got used to** and the
**direction we chose**.

### Story frame (use this tone)

> API clients grew into workspaces: sign-in, sync, teams, updates, tabs you didn’t open.
> Pigeon is the opposite bet — a native app on your machine that organizes itself so you can
> send a request and move on.

### Three pillars (Why section — already on site)

| Pillar | Story line | Not this |
|---|---|---|
| **No account, ever** | Open app → send request. No invite, no workspace. | “No login required feature” |
| **Local by default** | Keys and history on your disk, not someone’s cloud. | “Offline-first architecture” |
| **Native, not bloated** | Small install, fast launch — built for API work only. | “Electron alternative” |

### When someone asks “Postman alternative?”

Answer in **FAQ / meta / title tag** for SEO. On the page body, show behavior Postman doesn’t
emphasize: **auto-filed drafts**, **tabs that name themselves**, **no save dialog**. Let them
infer the comparison.

**Never:** side-by-side checklists, snark, “Postman bad.” **Always:** what Pigeon optimizes for.

---

## Section recipe (copy + layout)

Every narrative section uses the same shape as `OrganizeSection` and `FeaturesSection`:

| Layer | Role | Example |
|---|---|---|
| **Kicker** | 2–4 words, lowercase | `the best part` · `while you edit` |
| **Headline** | Verb outcome, ≤8 words | Send it. It sorts itself. |
| **Lead** | One sentence, human pain | No naming, filing, or saving by hand. |
| **Demo** | Silent animation, 3 beats | `.org-cap c0` → `c1` → `c2` |
| **Story line** | Under demo, micro-arc | Pasted → formatted → done |
| **Card title** | Outcome, not feature name | Braces keep up · not “Auto-close hook” |
| **Card body** | One frustration + one relief | Docs love trailing commas. You don’t fix them by hand. |

### Caption beats (demo internals)

Three beats max per card. Present tense, no punctuation overload:

- `Untitled tab` → `URL typed` → `Auto-named`
- `Pasted from docs` → `Hit Format` → `Ready to send`

Implementation: `apps/site/src/styles/why-story-demos.css` + `.sc-caps` / `.org-caps`.

---

## Hero: story before sell

1. **Demo runs first** (~7 steps: launch → tab → send → response → draft → filed).
2. **H1 appears after** the first cycle — visitor already saw the product.
3. H1 is a **promise**, not a category: “Never **save a request** again.”
4. Sub is **one breath**: names, files, remembers — local, no account.

Do not lead with “open-source API client for macOS.” That’s for `<title>` and Google.

---

## Adding a new story beat (e.g. JSON editor)

When we ship a small quality-of-life fix in the app:

1. **Find the moment** — “I pasted JSON from Stack Overflow and it had a trailing comma.”
2. **Write the arc** — paste → Format → send (three captions).
3. **One card or one section** — don’t expand the features grid into a manual.
4. **Place after Organize, before Features** if it’s a *daily moment*; inside Features only if
   it’s a major capability.
5. **Sync demo chrome** with desktop when colors or labels change (design tokens, not one-off hex).

Rejected pattern: “Format JSON removes trailing commas and preserves `{{variables}}`.”  
Approved pattern: **Paste it messy. Send it clean.**

---

## Keep visitors moving

| Technique | Where |
|---|---|
| Autoplay demos when in view | `useInViewPlay`, `useHeroDemo` |
| Hover replays one card | `FeaturesSection` `hoverIdx` |
| Scroll reveal stagger | `useScrollReveal`, `--d` delays |
| Short sections | Prefer 3 cards × one screen over one long wall |
| Sticky nav + repeated Download | Header always offers exit to install |
| Reduced motion | Respect `prefers-reduced-motion` — story still readable as static |

**Stuck visitor symptom:** scrolling fast without pausing → too much text, not enough motion.  
**Fix:** cut copy in half, add or lengthen demo loop.

---

## Features grid: toolkit, not encyclopedia

The features section is the **widest** part of the story — still not a spec.

- Each card **must** have: demo + `story` string + ≤2 sentence body.
- `story` examples already on site: `Method → URL → params → Send`, `Flip env → vars swap`.
- Order cards by **recognition**, not importance: request builder → speed → envs → collections →
  curl → shortcuts.

Add new cards only when there is a **visual story** we can animate in ~5s.

---

## SEO vs story (split responsibility)

| SEO / robots | Human scroll |
|---|---|
| `<title>`, meta description | Hero H1 + lead |
| FAQ JSON-LD | Why section pillars |
| “Postman alternative” in title | Never in hero headline |
| SoftwareApplication schema | Open source section |

Write SEO once in `constants.ts` / `index.astro`. Write humans in section components.

---

## Checklist before shipping a section

- [ ] Headline is outcome, not feature name
- [ ] Lead is one sentence; could be spoken aloud
- [ ] Demo has 3 caption beats; works without reading body text
- [ ] Story line under demo stands alone
- [ ] No bullet list in user-facing copy
- [ ] No competitor name in headline
- [ ] CTA visible within one scroll of section end
- [ ] Compared to desktop app — demo still looks like the product
- [ ] `prefers-reduced-motion`: section still makes sense

---

## Key files

| File | Purpose |
|---|---|
| `apps/site/src/components/HomePage.tsx` | Section order |
| `apps/site/src/components/HeroSection.tsx` | Hero story + demo shell |
| `apps/site/src/lib/heroDemoSteps.ts` | Hero beat labels |
| `apps/site/src/components/OrganizeSection.tsx` | Reference narrative section |
| `apps/site/src/components/MomentsSection.tsx` | "While you edit" daily-win demos |
| `apps/site/src/styles/moments.css` | Moments demo animations |
| `apps/site/src/components/FeaturesSection.tsx` | Cards with `story` + demos |
| `apps/site/src/components/WhySection.tsx` | Philosophy, not comparison |
| `apps/site/src/styles/why-story-demos.css` | Demo animations |

---

## Related

- [features/marketing-site.md](./features/marketing-site.md) — routes, worker, acceptance criteria
- [landing-page-plan.md](./landing-page-plan.md) — SEO, CTAs, platform download
- [features/collections.md](./features/collections.md) — auto-file behavior (Organize story source)
- [features/request-builder.md](./features/request-builder.md) — body editor behavior (Moments story source)
