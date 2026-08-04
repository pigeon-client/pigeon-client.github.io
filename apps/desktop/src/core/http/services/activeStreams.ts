/** In-flight abort controllers + SSE stream ids, keyed by tab id. */

const controllers = new Map<string, AbortController>();
const streamIds = new Map<string, string>();

export function beginTabStream(tabId: string): { streamId: string; signal: AbortSignal } {
  cancelTabStream(tabId);
  const ac = new AbortController();
  const streamId = `sse-${tabId}-${Date.now()}`;
  controllers.set(tabId, ac);
  streamIds.set(tabId, streamId);
  return { streamId, signal: ac.signal };
}

export function getTabStreamId(tabId: string): string | undefined {
  return streamIds.get(tabId);
}

export function cancelTabStream(tabId: string): void {
  const ac = controllers.get(tabId);
  if (ac) {
    ac.abort();
    controllers.delete(tabId);
  }
  streamIds.delete(tabId);
}

export function endTabStream(tabId: string): void {
  controllers.delete(tabId);
  streamIds.delete(tabId);
}
