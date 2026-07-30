import { beforeEach, describe, expect, it } from "vitest";
import type { RequestConfig } from "@/shared/types";
import { setRetentionDays } from "./lib/retention";
import { useHistoryStore } from "./store";
import type { HistoryItem } from "./types";

function makeConfig(over: Partial<RequestConfig> = {}): RequestConfig {
  return {
    name: "t",
    method: "GET",
    url: "",
    params: [],
    headers: [],
    bodyType: "none",
    body: "",
    formData: [],
    multipart: [],
    file: null,
    auth: {
      type: "none",
      username: "",
      password: "",
      token: "",
      apiKey: "",
      apiValue: "",
      apiAddTo: "header",
    },
    ...over,
  };
}

function makeHistoryItem(i: number, timestamp = Date.now()): HistoryItem {
  return {
    name: `req-${i}`,
    method: "GET",
    url: `https://example.com/${i}`,
    statusCode: 200,
    responseTime: 10,
    timestamp,
    request: makeConfig({ url: `https://example.com/${i}` }),
  };
}

describe("history store", () => {
  beforeEach(() => {
    localStorage.clear();
    useHistoryStore.setState({
      history: [],
      drafts: [],
      historyDbIds: new Map(),
      draftDbIds: new Map(),
      loaded: false,
    });
  });

  it("keeps all 150 distinct history entries — no silent 100-entry cap", async () => {
    for (let i = 0; i < 150; i++) {
      await useHistoryStore.getState().addToHistory(makeHistoryItem(i));
    }
    expect(useHistoryStore.getState().history).toHaveLength(150);
  });

  it("prunes only entries outside the retention window on load", async () => {
    setRetentionDays(90);
    const DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();
    await useHistoryStore.getState().addToHistory(makeHistoryItem(1, now - 91 * DAY));
    await useHistoryStore.getState().addToHistory(makeHistoryItem(2, now - 10 * DAY));

    useHistoryStore.setState({ loaded: false });
    await useHistoryStore.getState().load();

    const urls = useHistoryStore.getState().history.map((h) => h.url);
    expect(urls).toEqual(["https://example.com/2"]);
  });
});
