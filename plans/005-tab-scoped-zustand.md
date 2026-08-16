# 005 — Tab-scoped Zustand selectors (keep inactive tabs mounted)

**Against:** `0c24a27` + working tree  
**Depends on:** 004 if both rewrite the same component imports  
**Effort:** M · **Risk:** Low · **Category:** performance

## Why

Every HTTP tab stays mounted (`display:none`) — **required** (`docs/testing.md`: inactive workspace tabs stay mounted so Playwright scopes testids with `:visible`). That is not a bug.

The bug is subscriptions: hidden `RequestEditor` / `ResponsePanel` / `UrlBar` re-render on unrelated store updates.

## Current

`apps/desktop/src/app/AppContent.tsx` ~474–527 maps all http tabs; `style={{ display: isActive ? "flex" : "none" }}`. Keep this.

`RequestEditor.tsx`:

```
const request = useTabStore((s) => s.tabs.find((t) => t.id === tabId)?.request);
```

This is already tab-scoped **if** `request` object identity is stable. Zustand uses `Object.is`. Confirm `updateTabRequest` clones only the edited tab.

`UrlBar` takes **no `tabId`**. Every instance does:

```
const tabs = useTabStore((s) => s.tabs);
const activeTabId = useTabStore((s) => s.activeTabId);
```

All hidden UrlBars still subscribe to the full `tabs` array → re-render on any tab’s keystroke.

`ResponsePanel.tsx` (audit ~343): `const tabs = useTabStore((s) => s.tabs)` — same problem.

## Scope

- IN: `UrlBar.tsx` (accept `tabId`), `AppContent.tsx` (`<UrlBar tabId={tab.id} />`)
- IN: `ResponsePanel.tsx` selectors
- IN: `RequestEditor.tsx` only if it still selects a wide slice
- OUT: unmounting tabs; virtualizing the tab strip; new Zustand middleware

## Steps

1. `UrlBar({ tabId: string })`. Select `s.tabs.find(t => t.id === tabId)` fields (request, loading, response, name) — not `s.tabs`. Send/cancel must target **that** `tabId`, including when inactive (should still work if a send started then user switched). If today’s UrlBar always acts on `activeTabId`, locking it to `tabId` matches “this instance belongs to this tab”.

2. `ResponsePanel`: replace `useTabStore((s) => s.tabs)` with a find-by-`tabId` selector that returns the tab (or `tab.response` + loading flags).

3. Wrap `RequestEditor`, `ResponsePanel`, `UrlBar` in `memo` if not already.

4. Do **not** add `useShallow` unless a selector returns a new object each time. Prefer selecting primitives/the `request` reference.

## Verify

```
pnpm --filter pigeon test
pnpm ci:check
```

Existing e2e that uses `:visible` `url-input` must still pass if you run `pnpm e2e` (optional locally; required that you do not unmount).

## Done when

No `UrlBar`/`ResponsePanel` selects the entire `tabs` array. Inactive tabs remain in the DOM (`display:none`).

## Escape

If UrlBar reads active-env / globals and those stores update at high frequency, that is acceptable (env changes are rare). Do not subscribe UrlBar to `s.tabs` “for convenience.”
