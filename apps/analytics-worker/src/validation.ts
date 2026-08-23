/** Supported anonymous analytics event names. */
export const SUPPORTED_EVENTS = ["install", "launch"] as const;
export type AnalyticsEventName = (typeof SUPPORTED_EVENTS)[number];

/** Supported OS platform labels from the desktop client. */
export const SUPPORTED_PLATFORMS = ["macos", "windows", "linux"] as const;
export type AnalyticsPlatform = (typeof SUPPORTED_PLATFORMS)[number];

/** Reasonable architecture values (Tauri / Rust target arch names). */
export const SUPPORTED_ARCHES = [
  "aarch64",
  "x86_64",
  "x86",
  "arm",
  "arm64",
  "i686",
  "riscv64",
  "universal",
  "unknown",
] as const;
export type AnalyticsArch = (typeof SUPPORTED_ARCHES)[number];

export const MAX_PAYLOAD_BYTES = 2048;
export const MAX_VERSION_LENGTH = 64;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VERSION_RE = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/;

export interface AnalyticsEventPayload {
  install_id: string;
  event: AnalyticsEventName;
  version: string;
  platform: AnalyticsPlatform;
  arch: string;
}

export type ValidationResult =
  | { ok: true; data: AnalyticsEventPayload }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function validateEventPayload(raw: unknown): ValidationResult {
  if (!isRecord(raw)) {
    return { ok: false, error: "Body must be a JSON object" };
  }

  const { install_id, event, version, platform, arch } = raw;

  if (typeof install_id !== "string" || !isValidUuid(install_id)) {
    return { ok: false, error: "install_id must be a valid UUID" };
  }

  if (typeof event !== "string" || !SUPPORTED_EVENTS.includes(event as AnalyticsEventName)) {
    return {
      ok: false,
      error: `event must be one of: ${SUPPORTED_EVENTS.join(", ")}`,
    };
  }

  if (
    typeof version !== "string" ||
    version.length === 0 ||
    version.length > MAX_VERSION_LENGTH ||
    !VERSION_RE.test(version)
  ) {
    return { ok: false, error: "version must be a reasonable version string" };
  }

  if (
    typeof platform !== "string" ||
    !SUPPORTED_PLATFORMS.includes(platform as AnalyticsPlatform)
  ) {
    return {
      ok: false,
      error: `platform must be one of: ${SUPPORTED_PLATFORMS.join(", ")}`,
    };
  }

  if (
    typeof arch !== "string" ||
    arch.length === 0 ||
    arch.length > 32 ||
    !SUPPORTED_ARCHES.includes(arch as AnalyticsArch)
  ) {
    return {
      ok: false,
      error: `arch must be one of: ${SUPPORTED_ARCHES.join(", ")}`,
    };
  }

  // Reject unexpected keys so callers cannot sneak PII fields into storage.
  const allowed = new Set(["install_id", "event", "version", "platform", "arch"]);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      return { ok: false, error: `Unexpected field: ${key}` };
    }
  }

  return {
    ok: true,
    data: {
      install_id: install_id.toLowerCase(),
      event: event as AnalyticsEventName,
      version,
      platform: platform as AnalyticsPlatform,
      arch,
    },
  };
}
