#!/usr/bin/env bash
set -euo pipefail

if [ "$(uname -s)" != "Darwin" ]; then
  echo "This installer only supports macOS." >&2
  exit 1
fi

SITE="${PIGEON_SITE:-https://trypigeon.dev}"

# Version: explicit arg, else latest from trypigeon.dev/release.json.
VERSION="${1-}"
if [ -z "$VERSION" ]; then
  echo "Resolving latest release from ${SITE}..."
  VERSION="$(curl -fsSL "${SITE}/release.json" \
    | sed -n 's/.*"tag_name": *"v\{0,1\}\([^"]*\)".*/\1/p' | head -1)"
fi
if [ -z "$VERSION" ]; then
  echo "Could not determine the latest version. Pass one explicitly: install.sh 0.1.2" >&2
  exit 1
fi
# Versions are dotted numerics only — reject anything else before it reaches a URL/path.
case "$VERSION" in
  *[!0-9.]*|"") echo "Invalid version: ${VERSION}" >&2; exit 1 ;;
esac

# Arch: Apple Silicon vs Intel → trypigeon.dev/download/latest/{arch}
case "$(uname -m)" in
  arm64|aarch64) ARCH="aarch64" ;;
  x86_64) ARCH="x64" ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

TMP_DMG="$(mktemp -t pigeon-install).dmg"
VOLUME="/Volumes/Pigeon"

cleanup() {
  hdiutil detach "$VOLUME" -force >/dev/null 2>&1 || true
  command rm -f "$TMP_DMG"
}
trap cleanup EXIT

# Download and mount FIRST — the existing install is only replaced once the
# new app has actually been fetched and verified to exist in the DMG.
echo "Downloading Pigeon v${VERSION} (${ARCH})..."
curl -fSL --progress-bar "${SITE}/download/latest/${ARCH}" -o "$TMP_DMG"

echo "Mounting DMG..."
hdiutil attach "$TMP_DMG" -mountpoint "$VOLUME" -nobrowse

if [ ! -d "$VOLUME/Pigeon.app" ]; then
  echo "Downloaded DMG does not contain Pigeon.app — aborting." >&2
  exit 1
fi

if [ -d "/Applications/Pigeon.app" ]; then
  echo "Removing existing Pigeon installation..."
  command rm -rf /Applications/Pigeon.app
fi

echo "Copying to Applications..."
cp -r "$VOLUME/Pigeon.app" /Applications/
sync

# Releases are ad-hoc signed (no Developer ID / notarization). Strip only the
# Gatekeeper quarantine xattr so the first launch is not blocked. This stays
# until an Apple signing certificate is available.
echo "Clearing Gatekeeper quarantine..."
xattr -dr com.apple.quarantine /Applications/Pigeon.app 2>/dev/null || true

echo "Unmounting DMG..."
sleep 1
hdiutil detach "$VOLUME" -force 2>/dev/null || hdiutil detach "$VOLUME" -force || true

echo ""
echo "Pigeon v${VERSION} installed successfully!"
echo "Open Pigeon from your Applications folder."
