import { beforeEach, describe, expect, it } from "vitest";
import { useTabStore } from "../store";
import { applySampleToActiveTab } from "./firstRequest";

beforeEach(() => {
  const s = useTabStore.getState();
  for (const t of [...s.tabs]) s.closeTab(t.id);
});

describe("applySampleToActiveTab", () => {
  it("reuses the active empty HTTP tab instead of opening another", () => {
    const existing = useTabStore.getState().activeTabId;
    expect(existing).toBeTruthy();
    const id = applySampleToActiveTab({
      url: "https://jsonplaceholder.typicode.com/todos/1",
      method: "GET",
    });
    expect(id).toBe(existing);
    expect(useTabStore.getState().tabs).toHaveLength(1);
    expect(useTabStore.getState().tabs[0].request.url).toContain("jsonplaceholder");
  });

  it("opens a new tab when the active tab already has a URL", () => {
    const s = useTabStore.getState();
    const first = s.activeTabId;
    if (!first) throw new Error("expected a tab");
    s.updateTabRequest(first, { url: "https://api.example.com/already" });
    const id = applySampleToActiveTab({
      url: "https://jsonplaceholder.typicode.com/todos/1",
      method: "GET",
    });
    expect(id).not.toBe(first);
    expect(useTabStore.getState().tabs).toHaveLength(2);
  });
});
