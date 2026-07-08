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
