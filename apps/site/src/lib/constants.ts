/** Canonical external links + install/update/download URLs. */
export const REPO_URL = "https://github.com/pigeon-client/pigeon";
export const RELEASES_URL = `${REPO_URL}/releases`;
export const ISSUES_URL = `${REPO_URL}/issues`;
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;

/** Canonical production site (meta/OG + updater/download endpoints). */
export const SITE_URL = "https://trypigeon.dev";
export const SITE_NAME = "Pigeon";
/** General contact inbox (footer mailto). */
export const CONTACT_EMAIL = "hello@trypigeon.dev";
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;

/** Desktop app auto-update manifest (Tauri updater). */
export const UPDATER_MANIFEST_URL = `${SITE_URL}/latest.json`;
/** Latest GitHub release metadata mirrored at deploy time. */
export const RELEASE_JSON_URL = `${SITE_URL}/release.json`;

export type MacDownloadArch = "aarch64" | "x64";

/** Latest macOS .dmg — Worker 302 → current GitHub release asset. */
export function downloadLatestUrl(arch: MacDownloadArch): string {
  return `${SITE_URL}/download/latest/${arch}`;
}

/** Hero / brand tagline — single source for UI, SEO, and JSON-LD. */
export const HERO_HEADLINE = "Built for Real Developers, Not Showoffs.";
/** Substring of `HERO_HEADLINE` rendered with the hero accent style. */
export const HERO_HEADLINE_ACCENT = "Real Developers";
export const HERO_SUB = "Focus on building. Pigeon keeps your APIs organized.";

/** Browser tab / OG title — brand voice first; competitor keywords on comparison pages + FAQ. */
export const DEFAULT_TITLE = `${HERO_HEADLINE.replace(/\.$/, "")} | ${SITE_NAME}`;
export const DEFAULT_DESCRIPTION = `${HERO_HEADLINE} ${HERO_SUB} Free open-source macOS API client — no account, no cloud.`;

/** Footer comparison pages — not in header nav (landing covers “why Pigeon”). */
export const COMPARISON_LINKS = [
  { href: "/postman-alternative", label: "Postman alternative" },
  { href: "/insomnia-alternative", label: "Insomnia alternative" },
] as const;

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
