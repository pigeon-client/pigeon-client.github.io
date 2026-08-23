/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly TAURI_ENV_PLATFORM?: string;
  readonly TAURI_ENV_ARCH?: string;
  /** Analytics worker base URL (no trailing slash). Empty/unset disables telemetry. */
  readonly VITE_ANALYTICS_API_URL?: string;
  readonly VITE_APP_VERSION?: string;
}
