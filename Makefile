export PATH := $(HOME)/.cargo/bin:$(PATH):/opt/homebrew/bin:/usr/local/bin

.PHONY: help install deps \
        lint format ci-check \
        test e2e e2e-ui e2e-headed e2e-watch e2e-install \
        dev dev-web build build-release \
        bench-startup \
        dev-site build-site preview-site preview-site-worker deploy-site \
        clean

.DEFAULT_GOAL := help

help:
	@echo "Setup"
	@echo "  install              All deps: pnpm workspace, Playwright Chromium, Rust crates"
	@echo "  deps                 pnpm install --frozen-lockfile (JS only)"
	@echo ""
	@echo "Quality"
	@echo "  lint                 Biome lint"
	@echo "  format               Biome lint+format write"
	@echo "  ci-check             Biome CI (merge gate)"
	@echo ""
	@echo "Tests"
	@echo "  test                 Vitest (no browser)"
	@echo "  e2e                  Playwright headless (starts Vite :1420)"
	@echo "  e2e-ui               Playwright UI — pick a spec, Chromium opens"
	@echo "  e2e-headed           Playwright with a visible window"
	@echo "  e2e-watch            Slow headed run of send.spec — watch URL + Send"
	@echo "  e2e-install          First-time Chromium for Playwright"
	@echo ""
	@echo "Desktop (Tauri)"
	@echo "  dev                  tauri dev"
	@echo "  dev-web              Vite browser app → http://localhost:1420"
	@echo "  build                tauri build"
	@echo "  build-release        tauri build — macOS .dmg"
	@echo "  bench-startup        Launch-time bench (macOS, 25 runs)"
	@echo ""
	@echo "Marketing site (trypigeon.dev)"
	@echo "  dev-site             Astro dev"
	@echo "  build-site           Astro build"
	@echo "  preview-site         Local static preview"
	@echo "  preview-site-worker  Wrangler + R2 locally"
	@echo "  deploy-site          Build → R2 → Worker"
	@echo ""
	@echo "  clean                Remove build artifacts and node_modules"

# ── Setup ──
install: deps e2e-install
	cd apps/desktop/src-tauri && cargo fetch

deps:
	pnpm install --frozen-lockfile

# ── Quality ──
lint:
	pnpm run lint

format:
	pnpm run check:write

ci-check:
	pnpm run ci:check

# ── Tests ──
test:
	pnpm test

e2e:
	pnpm e2e

e2e-ui:
	pnpm e2e:ui

e2e-headed:
	pnpm --filter pigeon e2e -- --headed --workers=1

# One Chromium window, slowed down, send-request spec only.
e2e-watch:
	SLOW_MO=400 pnpm --filter pigeon e2e -- --headed --workers=1 --timeout=120000 e2e/send.spec.ts

e2e-install:
	pnpm --filter pigeon exec playwright install chromium

# ── Desktop (Tauri) ──
dev:
	pnpm run tauri dev

dev-web:
	pnpm dev

build:
	pnpm run tauri build

build-release:
	pnpm run tauri build --bundles dmg

bench-startup:
	./scripts/bench-startup.sh --runs 25

# ── Marketing site ──
dev-site:
	pnpm --filter pigeon-site dev

build-site:
	pnpm run build:site

preview-site:
	pnpm run preview:site

preview-site-worker:
	pnpm run preview:site:worker

deploy-site:
	pnpm run deploy:site

# ── Housekeeping ──
clean:
	rm -rf apps/desktop/dist apps/desktop/src-tauri/target \
	       apps/site/dist apps/site/.astro apps/site/.wrangler \
	       node_modules apps/desktop/node_modules apps/site/node_modules
