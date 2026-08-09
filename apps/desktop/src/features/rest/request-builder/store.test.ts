import { beforeEach, describe, expect, it } from "vitest";
import { useTabStore } from "./store";

// The store auto-creates one tab at import. Reset to a single fresh tab per test.
beforeEach(() => {
  const s = useTabStore.getState();
  for (const t of [...s.tabs]) s.closeTab(t.id);
});

describe("tab name — auto vs manual", () => {
  it("auto name follows the URL path", () => {
    const s = useTabStore.getState();
    const id = s.addTab();
    s.updateTabRequest(id, { url: "https://api.example.com/todos" });
    expect(useTabStore.getState().tabs.find((t) => t.id === id)?.name).toBe("/todos");

    s.updateTabRequest(id, { url: "https://api.example.com/todo" });
    expect(useTabStore.getState().tabs.find((t) => t.id === id)?.name).toBe("/todo");
  });

  it("a manual rename locks the name against path changes", () => {
    const s = useTabStore.getState();
    const id = s.addTab();
    s.updateTabRequest(id, { url: "https://api.example.com/todos" });
    s.setTabName(id, "My Request");

    s.updateTabRequest(id, { url: "https://api.example.com/other" });
    const tab = useTabStore.getState().tabs.find((t) => t.id === id);
    expect(tab?.name).toBe("My Request");
    expect(tab?.request.nameLocked).toBe(true);
  });

  it("clearing the lock reverts to following the path", () => {
    const s = useTabStore.getState();
    const id = s.addTab();
    s.setTabName(id, "Manual");
    s.updateTabRequest(id, { url: "https://api.example.com/back", nameLocked: false });
    expect(useTabStore.getState().tabs.find((t) => t.id === id)?.name).toBe("/back");
  });

  it("loading a locked request keeps its name", () => {
    const s = useTabStore.getState();
    const id = s.addTab();
    // Simulate opening a saved request that was manually named.
    s.updateTabRequest(id, {
      url: "https://api.example.com/anything",
      name: "Saved Name",
      nameLocked: true,
    });
    expect(useTabStore.getState().tabs.find((t) => t.id === id)?.name).toBe("Saved Name");
  });
});

describe("duplicateTab", () => {
  it("clones request into a new active tab and clears response", () => {
    const s = useTabStore.getState();
    const id = s.addTab();
    s.updateTabRequest(id, {
      method: "POST",
      url: "https://api.example.com/todos",
      headers: [{ key: "X-Test", value: "1", enabled: true }],
      params: [{ key: "q", value: "a", enabled: true }],
      bodyType: "application/json",
      body: '{"ok":true}',
      auth: {
        type: "bearer",
        username: "",
        password: "",
        token: "secret",
        apiKey: "",
        apiValue: "",
        apiAddTo: "header",
      },
    });
    s.updateTabResponse(id, {
      status: 200,
      statusText: "OK",
      headers: {},
      body: [],
      responseTime: 1,
      size: 0,
      contentType: "application/json",
    });

    const source = useTabStore.getState().tabs.find((t) => t.id === id);
    expect(source).toBeTruthy();

    const copyId = useTabStore.getState().duplicateTab(id);
    expect(copyId).toBeTruthy();

    const state = useTabStore.getState();
    const copy = state.tabs.find((t) => t.id === copyId);
    expect(state.activeTabId).toBe(copyId);
    expect(copy?.name).toBe(source?.name);
    expect(copy?.nameLocked).toBe(source?.nameLocked);
    expect(copy?.response).toBeNull();
    expect(copy?.isLoading).toBe(false);
    expect(copy?.request.method).toBe("POST");
    expect(copy?.request.url).toBe("https://api.example.com/todos");
    expect(copy?.request.body).toBe('{"ok":true}');
    expect(copy?.request.auth.token).toBe("secret");
    // Mutating the copy must not touch the source arrays.
    copy?.request.headers.push({ key: "X-New", value: "2", enabled: true });
    expect(source?.request.headers).toHaveLength(1);
  });

  it("keeps auto-name unlocked so URL edits still rename the tab", () => {
    const s = useTabStore.getState();
    const id = s.addTab();
    s.updateTabRequest(id, { url: "https://api.example.com/todos" });
    const copyId = s.duplicateTab(id);
    expect(copyId).toBeTruthy();
    if (!copyId) throw new Error("Expected duplicate tab id");
    s.updateTabRequest(copyId, { url: "https://api.example.com/other" });
    const copy = useTabStore.getState().tabs.find((t) => t.id === copyId);
    expect(copy?.nameLocked).toBe(false);
    expect(copy?.name).toBe("/other");
  });

  it("returns null for an unknown tab id", () => {
    expect(useTabStore.getState().duplicateTab("missing")).toBeNull();
  });
});

describe("reorderTabs", () => {
  it("moves a tab before drop target and preserves active tab", () => {
    const s = useTabStore.getState();
    const first = s.tabs[0].id;
    const second = s.addTab();
    const third = s.addTab();
    s.setActiveTab(second);

    s.reorderTabs(third, first);

    const state = useTabStore.getState();
    expect(state.tabs.map((tab) => tab.id)).toEqual([third, first, second]);
    expect(state.activeTabId).toBe(second);
  });
});
