import type { AnalyticsPlatform } from "./types";

/** Production analytics Worker (Wrangler custom domain). */
export const DEFAULT_ANALYTICS_API_URL = "https://analytics.trypigeon.dev";

/** Map Tauri / Node platform strings to analytics platform labels. */
export function normalizePlatform(raw: string | undefined): AnalyticsPlatform {
  const p = (raw ?? "").toLowerCase();
  if (p === "darwin" || p === "macos" || p === "osx") return "macos";
  if (p === "win32" || p === "windows") return "windows";
  if (p === "linux") return "linux";
  // Browser / unknown fallback — still a supported enum value for validation.
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("mac")) return "macos";
    if (ua.includes("win")) return "windows";
  }
  return "linux";
}

/** Map Tauri arch (or browser hints) to a worker-accepted arch string. */
export function normalizeArch(raw: string | undefined): string {
  const a = (raw ?? "").toLowerCase();
  if (a === "aarch64" || a === "arm64") return "aarch64";
  if (a === "x86_64" || a === "x64" || a === "amd64") return "x86_64";
  if (a === "x86" || a === "i686" || a === "ia32") return "x86";
  if (a === "arm") return "arm";
  if (a === "riscv64") return "riscv64";
  if (a === "universal") return "universal";
  return "unknown";
}

/**
 * Resolve analytics API base URL (no trailing slash).
 * - Explicit `VITE_ANALYTICS_API_URL` wins (including empty string to disable).
 * - Production builds fall back to `DEFAULT_ANALYTICS_API_URL`.
 * - Dev / test: disabled unless the env var is set.
 */
export function resolveAnalyticsApiUrl(
  envValue: string | undefined = import.meta.env.VITE_ANALYTICS_API_URL,
  production: boolean = import.meta.env.PROD,
): string {
  if (typeof envValue === "string") {
    return envValue.trim().replace(/\/+$/, "");
  }
  return production ? DEFAULT_ANALYTICS_API_URL : "";
}
