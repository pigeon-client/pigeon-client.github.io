#!/bin/bash
set -e

VERSION="${1:-0.1.0}"
FILENAME="Pigeon_${VERSION}_aarch64.dmg"
TMP_DMG="/tmp/pigeon-install.dmg"
VOLUME="/Volumes/Pigeon"

if [ -d "/Applications/Pigeon.app" ]; then
  echo "Removing existing Pigeon installation..."
  rm -rf /Applications/Pigeon.app
fi

echo "Downloading Pigeon v${VERSION}..."
curl -L "https://github.com/pigeon-client/pigeon/releases/download/v${VERSION}/${FILENAME}" -o "$TMP_DMG"

echo "Mounting DMG..."
hdiutil attach "$TMP_DMG" -mountpoint "$VOLUME" -nobrowse

echo "Copying to Applications..."
cp -r "$VOLUME/Pigeon.app" /Applications/
sync

echo "Removing quarantine attribute..."
xattr -cr /Applications/Pigeon.app

echo "Unmounting DMG..."
sleep 1
hdiutil detach "$VOLUME" -force 2>/dev/null || hdiutil detach "$VOLUME" -force || true

echo "Cleaning up..."
rm -f "$TMP_DMG"

echo ""
echo "Pigeon v${VERSION} installed successfully!"
echo "Open Pigeon from your Applications folder."