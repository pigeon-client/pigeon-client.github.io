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

  it("rebuilds historyDbIds on prepend so slot 0 is the newest row", async () => {
    await useHistoryStore.getState().addToHistory(makeHistoryItem(1));
    const firstId = useHistoryStore.getState().history[0].id;
    expect(firstId).toBeGreaterThan(0);

    await useHistoryStore.getState().addToHistory(makeHistoryItem(2));
    const { history, historyDbIds } = useHistoryStore.getState();
    expect(historyDbIds.size).toBe(history.length);
    expect(historyDbIds.get(1)).toBe(firstId);
    expect(historyDbIds.get(0)).toBe(history[0].id);
  });

  it("updates the surviving history row after deleting index 0", async () => {
    await useHistoryStore.getState().addToHistory(makeHistoryItem(1));
    await useHistoryStore.getState().addToHistory(makeHistoryItem(2));
    await useHistoryStore.getState().removeHistory(0);

    await useHistoryStore.getState().addToHistory({
      ...makeHistoryItem(1),
      statusCode: 500,
      responseTime: 42,
      name: "req-1-updated",
    });

    expect(useHistoryStore.getState().history).toHaveLength(1);
    expect(useHistoryStore.getState().history[0]).toMatchObject({
      url: "https://example.com/1",
      statusCode: 500,
      responseTime: 42,
      name: "req-1-updated",
    });

    useHistoryStore.setState({
      loaded: false,
      history: [],
      drafts: [],
      historyDbIds: new Map(),
      draftDbIds: new Map(),
    });
    await useHistoryStore.getState().load();
    expect(useHistoryStore.getState().history).toHaveLength(1);
    expect(useHistoryStore.getState().history[0]).toMatchObject({
      url: "https://example.com/1",
      statusCode: 500,
      name: "req-1-updated",
    });
  });

  it("updates the surviving draft after removing index 0", async () => {
    await useHistoryStore
      .getState()
      .saveDraft(makeConfig({ url: "https://example.com/a", name: "a" }));
    await useHistoryStore
      .getState()
      .saveDraft(makeConfig({ url: "https://example.com/b", name: "b" }));
    await useHistoryStore.getState().removeDraft(0);

    const { drafts, draftDbIds } = useHistoryStore.getState();
    expect(drafts).toHaveLength(1);
    expect(draftDbIds.size).toBe(drafts.length);
    expect(draftDbIds.get(0)).toBe(drafts[0].id);

    await useHistoryStore.getState().updateDraftByKey("GET", "https://example.com/a", {
      name: "a-updated",
      body: "x",
    });

    useHistoryStore.setState({
      loaded: false,
      history: [],
      drafts: [],
      historyDbIds: new Map(),
      draftDbIds: new Map(),
    });
    await useHistoryStore.getState().load();
    expect(useHistoryStore.getState().drafts).toHaveLength(1);
    expect(useHistoryStore.getState().drafts[0]).toMatchObject({
      url: "https://example.com/a",
      name: "a-updated",
      body: "x",
    });
  });

  it("does not persist inherited draft auth or headers", async () => {
    await useHistoryStore.getState().saveDraft(
      makeConfig({
        url: "https://example.com/auth",
        headers: [
          { key: "X-Folder", value: "f", enabled: true, inherited: true },
          { key: "X-Own", value: "1", enabled: true },
        ],
        auth: {
          type: "bearer",
          username: "",
          password: "",
          token: "folder-token",
          apiKey: "",
          apiValue: "",
          apiAddTo: "header",
          inherited: true,
        },
      }),
    );

    useHistoryStore.setState({
      loaded: false,
      history: [],
      drafts: [],
      historyDbIds: new Map(),
      draftDbIds: new Map(),
    });
    await useHistoryStore.getState().load();
    const draft = useHistoryStore.getState().drafts[0];
    expect(draft.auth.type).toBe("none");
    expect(draft.auth.token).toBe("");
    expect(draft.auth.inherited).toBeUndefined();
    expect(draft.headers).toEqual([{ key: "X-Own", value: "1", enabled: true }]);
  });
});
