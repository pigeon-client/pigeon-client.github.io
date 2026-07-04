import { extractEndpoint } from "@/shared/lib/url";
import { sendRequest } from "../services/requestService";
import { useEnvStore } from "../store/envStore";
import { useHistoryStore } from "../store/historyStore";
import type { ApiResponse, HistoryItem, RequestConfig } from "../types";

export function useApiRequest() {
  const activeEnv = useEnvStore((state) => state.activeEnv);

  const send = async (config: RequestConfig): Promise<ApiResponse> => {
    const options = {
      followRedirects: localStorage.getItem("pg_follow_redirects") !== "false",
      sslVerify: localStorage.getItem("pg_ssl_verify") !== "false",
      proxyUrl: localStorage.getItem("pg_proxy_url") ?? "",
    };

    let result: ApiResponse;
    let sendError: Error | null = null;

    try {
      result = await sendRequest(config, activeEnv, options);
    } catch (e) {
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
  };
  await historyStore.addToHistory(historyItem);
}
