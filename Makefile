APP_NAME = Pigeon
BUNDLE_ID = com.k1n1.pigeon
export PATH := $(HOME)/.cargo/bin:/opt/homebrew/bin:/usr/local/bin:$(PATH)

.PHONY: all dev run build build-release clean install deps open lint format format-check ci-check

all: build

lint:
	pnpm run lint

format:
	pnpm run check:write

format-check:
	pnpm run format:check

ci-check:
	pnpm run ci:check

dev:
	pnpm run tauri dev

run: dev

build:
	pnpm run tauri build

build-release:
	pnpm run tauri build -- --bundles dmg

clean:
	rm -rf dist
	rm -rf src-tauri/target
	rm -rf node_modules

deps:
	pnpm install --frozen-lockfile

install: deps

open:
	open src-tauri/target/release/bundle/dmg/
