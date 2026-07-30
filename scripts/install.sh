#!/bin/bash
set -e

REPO="pigeon-client/pigeon"

# Version: use the explicit arg if given, else the latest published release.
VERSION="$1"
if [ -z "$VERSION" ]; then
  echo "Resolving latest release..."
  VERSION="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest" \
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

# Arch: Apple Silicon vs Intel → matching Tauri dmg name.
case "$(uname -m)" in
  arm64|aarch64) ARCH="aarch64" ;;
  x86_64) ARCH="x64" ;;
  *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

FILENAME="Pigeon_${VERSION}_${ARCH}.dmg"
TMP_DMG="$(mktemp -t pigeon-install).dmg"
VOLUME="/Volumes/Pigeon"

cleanup() {
  hdiutil detach "$VOLUME" -force >/dev/null 2>&1 || true
  rm -f "$TMP_DMG"
}
trap cleanup EXIT

# Download and mount FIRST — the existing install is only replaced once the
# new app has actually been fetched and verified to exist in the DMG.
echo "Downloading Pigeon v${VERSION} (${ARCH})..."
curl -fL "https://github.com/${REPO}/releases/download/v${VERSION}/${FILENAME}" -o "$TMP_DMG"

echo "Mounting DMG..."
hdiutil attach "$TMP_DMG" -mountpoint "$VOLUME" -nobrowse

if [ ! -d "$VOLUME/Pigeon.app" ]; then
  echo "Downloaded DMG does not contain Pigeon.app — aborting." >&2
  exit 1
fi

if [ -d "/Applications/Pigeon.app" ]; then
  echo "Removing existing Pigeon installation..."
  rm -rf /Applications/Pigeon.app
fi

echo "Copying to Applications..."
cp -r "$VOLUME/Pigeon.app" /Applications/
sync

# TODO(signing): remove once releases are Developer-ID signed + notarized —
# stripping quarantine bypasses Gatekeeper and should not be part of the flow.
echo "Removing quarantine attribute..."
xattr -cr /Applications/Pigeon.app

echo "Unmounting DMG..."
sleep 1
hdiutil detach "$VOLUME" -force 2>/dev/null || hdiutil detach "$VOLUME" -force || true

echo ""
echo "Pigeon v${VERSION} installed successfully!"
echo "Open Pigeon from your Applications folder."
