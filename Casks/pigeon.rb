cask "pigeon" do
  arch arm: "aarch64", intel: "x64"

  version "0.1.9"
  sha256 arm:   "REPLACE_WITH_SHA256_OF_Pigeon_#{version}_aarch64.dmg",
         intel: "REPLACE_WITH_SHA256_OF_Pigeon_#{version}_x64.dmg"

  url "https://github.com/pigeon-client/pigeon/releases/download/v#{version}/Pigeon_#{version}_#{arch}.dmg"
  name "Pigeon"
  desc "Fast, native, private API client (Tauri + Rust)"
  homepage "https://pigeon-client.github.io"

  app "Pigeon.app"

  zap trash: [
    "~/Library/Application Support/com.k1n1.pigeon",
    "~/Library/Caches/com.k1n1.pigeon",
    "~/Library/Preferences/com.k1n1.pigeon.plist",
    "~/Library/Saved Application State/com.k1n1.pigeon.savedState",
    "~/Pifeon",
  ]
end
