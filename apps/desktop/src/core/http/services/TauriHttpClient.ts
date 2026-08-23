import { invoke } from "@tauri-apps/api/core";
import { decodeIpcResponse, type IpcApiResponse } from "../lib/bytes";
import type { HttpClient, HttpRequest } from "../ports/HttpClient";
import type { ApiResponse } from "../types";

/** Thin wrapper over the Rust `send_api_request` command. No business logic. */
export const tauriHttpClient: HttpClient = {
  async send(request: HttpRequest): Promise<ApiResponse> {
    const raw = await invoke<IpcApiResponse>("send_api_request", {
      method: request.method,
      url: request.url,
      headers: request.headers,
      body: request.body,
      bodyType: request.bodyType,
      followRedirects: request.followRedirects,
      sslVerify: request.sslVerify,
      proxyUrl: request.proxyUrl,
    });
    return decodeIpcResponse(raw);
  },
};
