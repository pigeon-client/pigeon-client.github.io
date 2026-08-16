import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "@/shared/lib/platform";

/** OAuth needs a system browser + loopback redirect — desktop-app only, no browser-build path. */
export class OauthUnsupportedError extends Error {}

function assertTauri(action: string): void {
  if (!isTauri()) {
    throw new OauthUnsupportedError(`${action} requires the desktop app.`);
  }
}

export interface OauthHttpResponse {
  status: number;
  headers: Record<string, string>;
  bodyText: string;
  truncated?: boolean;
}

/** Generic HTTP call for OAuth discovery / dynamic client registration / token exchange. */
export async function oauthHttpRequest(
  method: "GET" | "POST",
  url: string,
  headers: Record<string, string>,
  body?: string,
): Promise<OauthHttpResponse> {
  assertTauri("OAuth discovery/token requests");
  return invoke<OauthHttpResponse>("oauth_http_request", {
    method,
    url,
    headers: Object.entries(headers).map(([key, value]) => ({ key, value })),
    body,
  });
}

export async function openExternalUrl(url: string): Promise<void> {
  assertTauri("Opening the authorization page");
  await invoke("open_external_url", { url });
}

export interface LoopbackHandle {
  listenerId: string;
  port: number;
}

export async function openOauthLoopback(): Promise<LoopbackHandle> {
  assertTauri("The OAuth redirect listener");
  return invoke<LoopbackHandle>("oauth_loopback_open");
}

export interface LoopbackResult {
  code: string | null;
  state: string | null;
  error: string | null;
}

export async function waitForOauthLoopback(
  listenerId: string,
  timeoutMs: number,
): Promise<LoopbackResult> {
  assertTauri("The OAuth redirect listener");
  return invoke<LoopbackResult>("oauth_loopback_wait", { listenerId, timeoutMs });
}
