import { beforeEach, describe, expect, it } from "vitest";
import { useCollectionStore } from "./store";

// db.ts wrappers no-op off-Tauri, so these exercise the in-memory tree logic.
beforeEach(() => {
  useCollectionStore.setState({ collections: [] });
});

describe("collections store — immutable tree updates", () => {
  it("adds a collection and returns a fresh array reference", async () => {
    const before = useCollectionStore.getState().collections;
    const id = await useCollectionStore.getState().addCollection("My API");
    const after = useCollectionStore.getState().collections;

    expect(id).toBeTruthy();
    expect(after).not.toBe(before); // new array
    expect(after).toHaveLength(1);
    expect(after[0].name).toBe("My API");
    expect(after[0].root).toEqual([]);
  });

  it("adding a folder rebuilds the collection object (no in-place mutation)", async () => {
    const store = useCollectionStore.getState();
    const id = (await store.addCollection("C")) as string;
    const original = useCollectionStore.getState().collections[0];

    const ok = await store.addFolder(id, null, "Folder A");
    const updated = useCollectionStore.getState().collections[0];

    expect(ok).toBe(true);
    expect(updated).not.toBe(original); // collection replaced, not mutated
    expect(original.root).toEqual([]); // old snapshot untouched
    expect(updated.root).toHaveLength(1);
    expect(updated.root[0]).toMatchObject({ type: "folder", name: "Folder A" });
  });

  it("renaming a node keeps siblings and rebuilds references", async () => {
    const store = useCollectionStore.getState();
    const id = (await store.addCollection("C")) as string;
    await store.addFolder(id, null, "One");
    await store.addFolder(id, null, "Two");

    const before = useCollectionStore.getState().collections[0];
    const nodeId = before.root[0].id;
    await store.renameNode(id, nodeId, "One-renamed");
    const after = useCollectionStore.getState().collections[0];

    expect(after).not.toBe(before);
    expect(after.root).toHaveLength(2);
    expect(after.root.find((n) => n.id === nodeId)?.name).toBe("One-renamed");
    expect(after.root[1].name).toBe("Two");
  });
});
