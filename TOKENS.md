# Design Tokens — Single Source of Truth

All styling values live in `src/styles/index.css` (Tailwind v4 `@theme` + per-theme
CSS variables). **Components reference tokens only** — no raw `px`, no ad-hoc hex, no
inline color literals. This file documents the scales; the token layer is the source.

Two themes: `:root` (light, default) and `.dark`. `.theme-pink` is dead — only a
`.pg-logo` selector remains for `.theme-light`. Colors are semantic and defined
per theme; never reference a raw ramp (`--gray-800`) from a component.

---

## Color

Semantic shadcn palette (per theme): `background foreground card popover primary
secondary muted accent destructive border input ring` + foregrounds.

Pigeon domain colors (per theme): `--color-method-{get,post,put,patch,delete,head,options}`,
`--color-status-{2xx,3xx,4xx,5xx}`, `--hljs-*`.

Semantic surface/text aliases (consumed by inline styles as `var(--…)`):

| token | aliases | use |
|---|---|---|
| `--bg-base` | `--background` | app background |
| `--bg-surface` | `--card` | panels |
| `--bg-elevated` | `--popover` | menus, raised surfaces |
| `--bg-input` | `--input` | field fills |
| `--text-primary` | `--foreground` | primary text |
| `--text-secondary` | `--muted-foreground` | secondary text |
| `--text-placeholder` | `--muted-foreground` @60% | placeholders |
| `--color-scrim` / `--scrim` | `rgb(0 0 0 / .5)` | modal/drawer backdrop |

**Rule:** no hex or `rgba()` in components. Every hardcoded color maps to a token
(see Migration Notes).

## Type scale

Tailwind's named scale is kept (used correctly, zero drift): `text-xs`=12 · `text-sm`=14
· `text-base`=16 · `text-lg`=18 · `text-2xl`=24. Two additions cover the divergent
clusters:

| token | px | line-height | role |
|---|---|---|---|
| `text-2xs` | 10 | 14 | badges, kbd, micro-labels |
| `text-xs` | 12 | (tw) | default UI text |
| `text-code` | 13 | 21 | dense / mono body |
| `text-sm` | 14 | (tw) | emphasized text |
| `text-base` | 16 | (tw) | — |
| `text-lg` | 18 | (tw) | section title |
| `text-2xl` | 24 | (tw) | empty-state heading |

Weights: `font-normal 400` · `font-medium 500` · `font-semibold 600` · `font-bold 700`.
Line-heights: `--leading-normal 1.5` · `--leading-mono 21px` · `--leading-relaxed 1.625`.

## Radius (unified, non-theme)

| token | px |
|---|---|
| `rounded-sm` | 4 |
| `rounded-md` = `rounded` (`--radius`) | 6 |
| `rounded-lg` | 8 |
| `rounded-xl` | 12 |
| `rounded-full` | 9999 |

Was: light 4px / dark 16px (bug). Now 6px both.

## Spacing (Tailwind default 4-grid — no custom tokens)

`0 2 4 6 8 10 12 16 20 24`. Gaps/padding use `gap-* / p*-*`. Off-grid inline values
(`7 11 18`) snap to `8 / 12 / 16`.

## Borders

Widths: `1px` (default) · `2px` (tab underline, focus). `1.5px` retired → `2px`.
Color: `--border` (via base `@apply border-border`).

## Shadows

shadcn `shadow-sm/md/lg/xl` kept. Overlay shadows are named (no arbitrary `shadow-[…]`):

| token | value |
|---|---|
| `--shadow-drawer` | `-8px 0 40px rgb(0 0 0 / .5)` |
| `--shadow-modal` | `0 32px 80px rgb(0 0 0 / .6)` |
| `--shadow-toast` | `0 14px 40px rgb(0 0 0 / .5)` |

## Focus ring (one convention)

`ring-2 ring-ring ring-offset-2 ring-offset-background` for all interactive elements.
The `focus:border-primary` input variant is retired.

## z-index scale

| token | value | layer |
|---|---|---|
| `--z-raised` | 1 | stacked children (textarea overlay) |
| `--z-dropdown` | 10 | inline dropdowns |
| `--z-sticky` | 20 | sticky headers |
| `--z-popover` | 30 | popovers, suggestions |
| `--z-overlay` | 40 | drawer scrim |
| `--z-modal` | 50 | modals |
| `--z-toast` | 60 | toasts (above modals) |

Replaces ad-hoc `1/10/40/50/90/100` + inline `80/999/1000`.

---

## Component size sets (interactive: sm / md / lg)

Height + padding + font move together as a matched set, built from the scales above.

| size | height | px-pad | font | radius | use |
|---|---|---|---|---|---|
| **sm** | 28 | 10 | `text-xs` 12 | md | chips, ghost/icon buttons, tabs |
| **md** | 32 | 12 | `text-code` 13 | md | default button, input, select |
| **lg** | 40 | 20 | `text-sm` 14 | md | primary CTA |

`button` cva (currently icon/xs/sm/md/lg = 28/28/32/40/44) collapses to sm/md/lg;
`xs`→`sm`, `lg`(44)→`lg`(40). Underline tabs (36) → `md`(32).

**Rule:** interactive components pick a size set. They must not set height, padding,
and font-size independently off-scale.

---

## MIGRATION NOTES

How appearance changes when components adopt these tokens (separate later pass).
Grouped by visibility so the component migration is reviewable.

### Already applied by the token layer (visible NOW, no component edit)
These changed the moment `index.css` shipped — verify on load:

- **68 orphaned inline color refs un-break.** `var(--text-secondary/primary/placeholder)`,
  `var(--bg-base/surface/elevated/input)` were undefined → rendered as inherited/initial.
  Now resolve to the correct per-theme color. Any surface relying on the broken
  fallback will look different (corrected).
- **Dark-mode radius −10px.** `.dark --radius` 16→6px. All 80 `rounded` sites in dark
  mode tighten. Highly visible.
- **Light-mode radius +2px.** `:root --radius` 4→6px. Subtle.

### ≥4px — visible, call out in review
| site | count | change |
|---|---|---|
| underline tabs `h-9` 36 → `md` 32 | 5 | −4px height |
| `button` lg `h-11` 44 → `lg` 40 | 4 | −4px height |

### 1–2px — noticeable
| raw | → token | delta | count |
|---|---|---|---|
| `text-[11px]` | `text-2xs` 10 | −1 | 15 |
| control `h-8.5` 34 | `md` 32 | −2 | 1 |
| control 38 | `lg` 40 | +2 | 3 |
| `text-[9px]` | `text-2xs` 10 | +1 | 3 |
| `text-[15px]` | `text-base` 16 | +1 | 1 |
| gap `7`→8, `11`→12, `18`→16 | Tailwind grid | ±1–2 | ~6 |

### ≤0.5px — effectively invisible
| raw | → token | count |
|---|---|---|
| `text-[10.5px]` | `text-2xs` 10 | 10 |
| `text-[12.5px]` | `text-xs` 12 | 14 |
| `text-[13.5px]` | `text-code` 13 | 3 |
| `text-[11.5px]` | `text-2xs` 10 | 8 |

### Color remaps — appearance-correct (fixes light mode)
The 8 hardcoded hex are baked **dark-mode** values shown in both themes (wrong in
light). Remapping to tokens makes them theme-correct — a visible improvement in light:

| hardcoded | count | → token |
|---|---|---|
| `#F87171` | 6 | `status-5xx` |
| `#4ADE80` | 4 | `status-2xx` |
| `#60A5FA` | 2 | `status-3xx` |
| `#94A3B8` | 2 | `method-options` |
| `#FB923C` | 1 | `status-4xx` |
| `#4A9EFA` | 1 | `method-get` |
| `#fff` | 1 | `primary-foreground` |
| `#1b1b22` | 2 | `bg-base` |
| `rgba(0,0,0,.5/.55/.6)` | 5 | `scrim` / `--shadow-modal` |

### Zero-drift (safe, cosmetic-neutral)
`text-xs/sm/base/lg/2xl` (48 sites, kept identical), 1px borders (305), Tailwind-grid
gaps/padding already on-scale, `font-*` weights, `rounded-full`, existing `--color-*`
domain tokens.

### z-index remaps (relative order preserved)
`z-[100]`/`999`/`1000` → `--z-modal` 50; inline toast `80` → `--z-toast` 60 (now above
modals); `z-[1]/[2]` → `--z-raised`; `z-50`→`popover`, `z-40`→`sticky`, `z-[90]`→`overlay`.
No visual change beyond toast correctly stacking above modal.
