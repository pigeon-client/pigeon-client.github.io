/** Canonical external links + install command, in one place. */
export const REPO_URL = "https://github.com/pigeon-client/pigeon";
export const RELEASES_URL = `${REPO_URL}/releases`;
export const RELEASES_LATEST_URL = `${RELEASES_URL}/latest`;
export const ISSUES_URL = `${REPO_URL}/issues`;
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;
/** Canonical production site (meta/OG). Runtime install URL uses the current origin. */
export const SITE_URL = "https://pigeon-client.github.io";

/**
 * Install one-liner for the current host.
 * Production → https://pigeon-client.github.io/install.sh
 * Local preview → http://127.0.0.1:5174/install.sh
 */
export function getInstallCmd(origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : SITE_URL);
  return `curl -fsSL ${base.replace(/\/$/, "")}/install.sh | sh`;
}

export function getInstallScriptUrl(origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : SITE_URL);
  return `${base.replace(/\/$/, "")}/install.sh`;
}
