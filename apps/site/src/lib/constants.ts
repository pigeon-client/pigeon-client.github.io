/** Canonical external links + install/update/download URLs. */
export const REPO_URL = "https://github.com/pigeon-client/pigeon";
export const RELEASES_URL = `${REPO_URL}/releases`;
export const ISSUES_URL = `${REPO_URL}/issues`;
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;

/** Canonical production site (meta/OG + updater/download endpoints). */
export const SITE_URL = "https://trypigeon.dev";
export const SITE_NAME = "Pigeon";

/** Desktop app auto-update manifest (Tauri updater). */
export const UPDATER_MANIFEST_URL = `${SITE_URL}/latest.json`;
/** Latest GitHub release metadata mirrored at deploy time. */
export const RELEASE_JSON_URL = `${SITE_URL}/release.json`;

export type MacDownloadArch = "aarch64" | "x64";

/** Latest macOS .dmg — Worker 302 → current GitHub release asset. */
export function downloadLatestUrl(arch: MacDownloadArch): string {
  return `${SITE_URL}/download/latest/${arch}`;
}

export const DEFAULT_DESCRIPTION =
  "Pigeon auto-names your tabs, files every request by domain, and writes your history for you. A free, open-source, native API client for macOS. No account, no cloud, no busywork.";
export const DEFAULT_TITLE =
  "Pigeon — The API Client That Organizes Itself | Free Open-Source Postman Alternative";

/**
 * Install one-liner for the current host.
 * Production → https://trypigeon.dev/install.sh
 * Local preview → http://127.0.0.1:4321/install.sh
 */
export function getInstallCmd(origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : SITE_URL);
  return `curl -fsSL ${base.replace(/\/$/, "")}/install.sh | sh`;
}

export function getInstallScriptUrl(origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : SITE_URL);
  return `${base.replace(/\/$/, "")}/install.sh`;
}
