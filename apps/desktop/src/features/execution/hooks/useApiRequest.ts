import { makeResolver, selectActiveEnv, useEnvStore } from "@/features/environments";
import type { HistoryItem } from "@/features/history";
import { buildSnapshot, useHistoryStore } from "@/features/history";
import { extractEndpoint } from "@/shared/lib/url";
import type { RequestConfig } from "@/shared/types";
import type { SseEvent, SseMeta } from "../lib/sse";
import {
  type SendOptions,
  sendRequest,
  UnresolvedVariablesError,
} from "../services/requestService";
import type { ApiResponse } from "../types";

export function useApiRequest() {
  const activeEnv = useEnvStore(selectActiveEnv);
  const globals = useEnvStore((s) => s.globals);

  const send = async (
    config: RequestConfig,
    streamOpts?: Pick<SendOptions, "streamId" | "signal" | "onSseMeta" | "onSseEvent">,
  ): Promise<ApiResponse> => {
    const options: SendOptions = {
      followRedirects: localStorage.getItem("pg_follow_redirects") !== "false",
      sslVerify: localStorage.getItem("pg_ssl_verify") !== "false",
      proxyUrl: localStorage.getItem("pg_proxy_url") ?? "",
      ...streamOpts,
    };

    const resolve = makeResolver(activeEnv, globals);

    let result: ApiResponse;
    let sendError: Error | null = null;

    try {
      result = await sendRequest(config, resolve, options);
    } catch (e) {
      // A blocked send (unresolved variables) never dispatched — don't save it
      // as history/draft, just surface the error to the caller.
      if (e instanceof UnresolvedVariablesError) throw e;
      sendError = e instanceof Error ? e : new Error(String(e));
      result = {
        status: 0,
        statusText: String(e),
        headers: {},
        body: [],
        contentType: "text/plain",
        responseTime: 0,
        size: 0,
        resolvedUrl: config.url,
        sentHeaders: {},
      };
    }

    autoSave(config, result).catch(() => {});

    if (sendError) throw sendError;
    return result;
  };

  return { sendRequest: send };
}

async function autoSave(config: RequestConfig, result: ApiResponse) {
  const historyStore = useHistoryStore.getState();
  await historyStore.saveOrUpdateDraft({
    ...config,
    name: extractEndpoint(config.url),
  });
  const historyItem: HistoryItem = {
    name: config.name || extractEndpoint(config.url),
    method: config.method,
    url: config.url,
    statusCode: result.status,
    responseTime: result.responseTime,
    timestamp: Date.now(),
    request: { ...config, name: config.name || extractEndpoint(config.url) },
    // SSE responses stream indefinitely — nothing stable to snapshot.
    // Snapshot persistence is opt-out in Settings (responses may hold sensitive data).
    snapshot:
      result.sse || localStorage.getItem("pg_save_snapshots") === "false"
        ? undefined
        : buildSnapshot(result),
  };
  await historyStore.addToHistory(historyItem);
}

export type { SseEvent, SseMeta };
