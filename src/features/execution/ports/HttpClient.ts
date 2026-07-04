import type { BodyType, HttpMethod } from "@/shared/types";
import type { ApiResponse } from "../types";

/** A resolved, ready-to-send HTTP request (env vars already interpolated). */
export interface HttpRequest {
  method: HttpMethod;
  url: string;
  headers: { key: string; value: string }[];
  body: string | null;
  bodyType: BodyType;
  followRedirects: boolean;
  sslVerify: boolean;
  proxyUrl: string;
}

/**
 * Transport seam for execution. The default implementation is Tauri-backed
 * (Rust `reqwest`, no CORS). Swappable for tests or a web transport.
 */
export interface HttpClient {
  send(request: HttpRequest): Promise<ApiResponse>;
}
