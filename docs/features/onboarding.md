# Onboarding

## Overview

First-run overlay on the REST workbench: a welcome card, then two spotlight steps on the URL bar
and Send. Completing or skipping it writes `pg_onboarding_complete` and does not come back.
There is no replay in Settings.

## Problem / job to be done

A new user needs to see the send loop once — URL, Send, response — without hunting empty-state
copy or an About toggle. Returning users must not be blocked by the tour.

## User stories

- As a first-time user, I want a dedicated overlay that names Pigeon and shows the send loop.
- As a first-time user, I want the URL bar and Send pointed out, then to send a safe sample GET.
- As a first-time user, I want Skip or Escape to dismiss the tour immediately.
- As a returning user, I never want the tour again, including from Settings → About.

## Functional requirements

1. REST window only. MCP / GraphQL coming-soon windows do not show the overlay.
2. Pending when `localStorage.pg_onboarding_complete` is not `"true"`. Completing or skipping
   sets that key. Shown only when **no HTTP tab has a URL** (empty-request state). If a
   request is already open (restored session), the overlay is skipped and the key is set so
   it never comes back.
3. Steps: welcome → spotlight URL bar (`url-bar-compose`) → spotlight Send. Backdrop does not
   dismiss. The highlighted control stays clickable through a hole in the scrim.
4. **Get started** loads the public JSONPlaceholder sample into the empty HTTP tab (same helper
   as empty-state **Load a sample**).
5. Step 2 waits for a real Send (`notifyOnboardingSend` from the URL bar). Overlay then gone;
   short toast: first request sent, ⌘Enter / ⌘T.
6. Skip (welcome or a tour card) and Escape complete onboarding without requiring a send.
7. Settings → About must not replay the tour.

## Non-functional requirements

- Overlay uses design tokens (`bg-scrim`, `z-modal`, `z-toast`) — no hardcoded colors.
- UrlBar imports `notifyOnboardingSend` from `features/onboarding/lib/store` (not the feature
  barrel) so it does not cycle through `Onboarding` → `firstRequest` → tab store.
- E2E `openApp` sets `pg_onboarding_complete` so existing specs are not blocked.

## Acceptance criteria

- [ ] Fresh profile with an empty tab: welcome card titled **Pigeon**; Get started → URL step →
      Next → Send step.
- [ ] Fresh profile with a restored URL tab: no overlay; flag is set; reload still has no overlay.
- [ ] Sending the sample dismisses the overlay and shows a 200 from the mocked/public GET.
- [ ] Skip or Escape leaves the workbench usable; flag is set; reload does not show the tour.
- [ ] Backdrop click does nothing.
- [ ] Settings → About has version / updates only — no “Show first-request guide”.
- [ ] Empty state is “No request open” + Load a sample, not a 3-step tutorial.

## UI

Centered welcome card (logo, title **Pigeon**, three chips URL / Send / Response, Get started,
Skip). Tour cards sit under the spotlight hole: “1 of 2 The URL bar”, “2 of 2 Send it”.

## UX / interactions

- Welcome is modal; tour leaves the target control live.
- Sample is a public GET — safe to run.
- Toast is non-blocking and auto-dismisses.

## Keyboard

Escape completes onboarding (capture phase, so it wins over other overlays). ⌘Enter still sends
when Send is enabled.

## States & edge cases

- Already complete → nothing rendered (except the brief post-send toast on the same session).
- Any HTTP tab already has a URL and the tour has not started → overlay skipped, flag set.
- Target not mounted yet → full scrim until the control appears (rAF poll).
- Inactive tabs are `display:none`; spotlight uses the first visible match.
- Browser / E2E `windowKind` is always `rest`.

## Manual test checklist

- [ ] Wipe `pg_onboarding_complete`; launch; walk Get started → Next → Send.
- [ ] Wipe flag; Skip; reload — no overlay; empty state is “No request open”.
- [ ] Wipe flag; restore a tab with a URL; launch — no overlay; reload still none.
- [ ] Wipe flag; Escape on welcome; same as Skip.
- [ ] Click the dimmed chrome during the tour — no dismiss.
- [ ] Settings → About: no replay control.

## Automation coverage

- Vitest: `src/features/onboarding/lib/store.test.ts`.
- Playwright: `e2e/onboarding.spec.ts` (full walk + Skip). Other specs skip via `openApp`.

## Test ids

`onboarding`, `onboarding-start`, `onboarding-skip`, `onboarding-next`, `onboarding-toast`.
Step via `data-onboarding-step` = `welcome` | `url` | `send`. Targets: `url-bar-compose`,
`data-send-btn`.

## Key files

`apps/desktop/src/features/onboarding/components/Onboarding.tsx`,
`OnboardingSpotlight.tsx`, `lib/store.ts`, mounted from `src/app/AppContent.tsx`. Sample load:
`features/rest/request-builder/lib/firstRequest.ts`. Send hook:
`features/rest/request-builder/components/UrlBar.tsx`.

## Open risks

- Spotlight geometry can miss if the URL bar layout changes without keeping `url-bar-compose`.
- Changing the storage key again will re-show the tour for everyone (intentional for this cut).
