APP_NAME = Pigeon
BUNDLE_ID = com.k1n1.pigeon
export PATH := $(HOME)/.cargo/bin:/opt/homebrew/bin:/usr/local/bin:$(PATH)

.PHONY: all dev build build-release clean install deps open

all: build

dev:
	npm run tauri dev

build:
	npm run tauri build

build-release:
	npm run tauri build -- --bundles dmg

clean:
	rm -rf dist
	rm -rf src-tauri/target
	rm -rf node_modules

deps:
	npm install

install: deps build-release
	@echo "App built at: src-tauri/target/release/bundle/dmg/$(APP_NAME)*.dmg"

open:
	open src-tauri/target/release/bundle/dmg/
