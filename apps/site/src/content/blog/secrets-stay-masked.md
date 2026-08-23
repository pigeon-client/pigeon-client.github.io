---
title: "Secrets stay masked"
description: "Pigeon masks sensitive env values and asks before destructive methods hit production. Safer everyday API work on macOS — free and open source."
seoTitle: "Masked API Secrets & Prod Guardrails in Pigeon Environments"
pubDate: 2026-08-19
heroImage: /blog/secrets-stay-masked.webp
heroImageAlt: "Environment row with a masked API key and a soft production confirm prompt."
---

API keys in plain text on a shared screen is a bad demo and a worse habit. Pigeon masks secret env values in the UI — you see dots, not `sk_live_…`.

You can still use the value. Send still works. You just don't broadcast the key to whoever's sitting nearby.

## The other guardrail

Flip to prod and fire a DELETE? Pigeon asks you to confirm. Same idea: a small pause that catches the "wrong env" mistake before it becomes a story.

## Not a vault product

We're not trying to be a secrets manager. We're trying to make the everyday env switcher safer without extra ceremony. Mask what's sensitive. Confirm what's dangerous. Keep working.

Pair this with [environments without the mess](/blog/environments-without-the-mess) and you've got the full picture.
