APP_NAME = Pigeon
BUNDLE_ID = com.k1n1.pigeon
export PATH := $(HOME)/.cargo/bin:$(PATH):/opt/homebrew/bin:/usr/local/bin

# pnpm workspace: desktop app = `pigeon`, marketing site = `pigeon-site`.
# All targets run from the repo root; root scripts delegate via `--filter`.
# Marketing site deploys to Cloudflare R2 + Worker (trypigeon.dev) via Wrangler.

.PHONY: all dev run build build-release clean install deps open \
        lint format format-check ci-check test e2e \
        dev-site build-site preview-site preview-site-worker deploy-site \
        bench-startup

all: build

deps:
	pnpm install --frozen-lockfile

install: deps

# ── Quality (Biome runs repo-wide from the root) ──
lint:
	pnpm run lint

format:
	pnpm run check:write

format-check:
	pnpm run format:check

ci-check:
	pnpm run ci:check

test:
	pnpm run test

e2e:
	pnpm run e2e

# ── Desktop app (apps/desktop) ──
dev:
	pnpm run tauri dev

run: dev

build:
	pnpm run tauri build

build-release:
	pnpm run tauri build --bundles dmg

open:
	open apps/desktop/src-tauri/target/release/bundle/dmg/

# Launch-time bench (macOS): process start → first window. Default 25 runs.
# Needs Accessibility for Terminal. Prefer release .app for real numbers.
bench-startup:
	./scripts/bench-startup.sh --runs 25

# ── Marketing site (apps/site → Cloudflare R2 + Worker / trypigeon.dev) ──
dev-site:
	pnpm --filter pigeon-site dev

build-site:
	pnpm run build:site

preview-site:
	pnpm run preview:site

# Local Worker runtime (Wrangler) against R2 — syncs dist locally first.
preview-site-worker:
	pnpm run preview:site:worker

# Needs Cloudflare auth: `pnpm --filter pigeon-site exec wrangler login`
# or CLOUDFLARE_API_TOKEN (+ CLOUDFLARE_ACCOUNT_ID) in the environment.
deploy-site:
	pnpm run deploy:site

# ── Housekeeping ──
clean:
	rm -rf apps/desktop/dist apps/desktop/src-tauri/target \
	       apps/site/dist apps/site/.astro apps/site/.wrangler \
	       node_modules apps/desktop/node_modules apps/site/node_modules
