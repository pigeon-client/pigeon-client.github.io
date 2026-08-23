import type { RequestConfig } from "@/shared/types";
import { parseCurl } from "../../import-export/services/curlService";
import { useTabStore } from "../store";

/** Public GET that always returns JSON — used by onboarding and the empty-state sample. */
export const SAMPLE_CURL =
  'curl https://jsonplaceholder.typicode.com/todos/1 -H "Accept: application/json"';

/** Fill the active empty HTTP tab, or open a new one. Returns the tab id. */
export function applySampleToActiveTab(parsed: Partial<RequestConfig>): string {
  const store = useTabStore.getState();
  let id = store.activeTabId;
  const tab = id ? store.tabs.find((t) => t.id === id) : undefined;
  if (!(id && tab && tab.kind === "http" && !tab.request.url.trim())) {
    id = store.addTab();
  }
  store.updateTabRequest(id, parsed);
  store.setActiveTab(id);
  return id;
}

export async function loadSampleRequest(): Promise<string | null> {
  const parsed = await parseCurl(SAMPLE_CURL);
  if (!parsed) return null;
  return applySampleToActiveTab(parsed);
}
