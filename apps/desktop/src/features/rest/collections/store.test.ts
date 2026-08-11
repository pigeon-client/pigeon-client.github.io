import { beforeEach, describe, expect, it } from "vitest";
import type { RequestConfig } from "@/shared/types";
import { findUniqueSavedRequest, useCollectionStore } from "./store";

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

  it("moveNode relocates a request into another folder", async () => {
    const store = useCollectionStore.getState();
    const id = (await store.addCollection("C")) as string;
    await store.addFolder(id, null, "Auth");
    await store.addFolder(id, null, "Users");
    const authId = useCollectionStore.getState().collections[0].root[0].id;
    const usersId = useCollectionStore.getState().collections[0].root[1].id;

    await store.addRequest(id, authId, "Login", {
      name: "Login",
      method: "POST",
      url: "https://api.example.com/login",
      headers: [],
      params: [],
      body: "",
      bodyType: "none",
      auth: { type: "none" } as RequestConfig["auth"],
      multipart: [],
      formData: [],
      file: null,
      nameLocked: false,
    });

    const requestId = useCollectionStore.getState().collections[0].root[0].children?.[0]?.id;
    expect(requestId).toBeTruthy();

    const ok = await store.moveNode(id, requestId as string, usersId);
    const after = useCollectionStore.getState().collections[0];

    expect(ok).toBe(true);
    expect(after.root.find((n) => n.id === authId)?.children ?? []).toHaveLength(0);
    expect(after.root.find((n) => n.id === usersId)?.children?.[0]).toMatchObject({
      type: "request",
      name: "Login",
    });
  });

  it("moveNode to collection root clears the parent folder", async () => {
    const store = useCollectionStore.getState();
    const id = (await store.addCollection("C")) as string;
    await store.addFolder(id, null, "Auth");
    const authId = useCollectionStore.getState().collections[0].root[0].id;
    await store.addRequest(id, authId, "Login", {
      name: "Login",
      method: "POST",
      url: "https://api.example.com/login",
      headers: [],
      params: [],
      body: "",
      bodyType: "none",
      auth: { type: "none" } as RequestConfig["auth"],
      multipart: [],
      formData: [],
      file: null,
      nameLocked: false,
    });
    const requestId = useCollectionStore.getState().collections[0].root[0].children?.[0]?.id;

    const ok = await store.moveNode(id, requestId as string, null);
    const after = useCollectionStore.getState().collections[0];

    expect(ok).toBe(true);
    expect(after.root.some((n) => n.id === requestId)).toBe(true);
    expect(after.root.find((n) => n.id === authId)?.children ?? []).toHaveLength(0);
  });

  it("moveNode relocates a request into another collection", async () => {
    const store = useCollectionStore.getState();
    const sourceId = (await store.addCollection("Source")) as string;
    const destId = (await store.addCollection("Dest")) as string;
    await store.addFolder(destId, null, "Users");
    const usersId = useCollectionStore.getState().collections.find((c) => c.id === destId)
      ?.root[0]?.id;
    expect(usersId).toBeTruthy();

    await store.addRequest(sourceId, null, "Login", {
      name: "Login",
      method: "POST",
      url: "https://api.example.com/login",
      headers: [],
      params: [],
      body: "",
      bodyType: "none",
      auth: { type: "none" } as RequestConfig["auth"],
      multipart: [],
      formData: [],
      file: null,
      nameLocked: false,
    });
    const requestId = useCollectionStore.getState().collections.find((c) => c.id === sourceId)
      ?.root[0]?.id;
    expect(requestId).toBeTruthy();

    const ok = await store.moveNode(sourceId, requestId as string, usersId as string, destId);
    const after = useCollectionStore.getState().collections;
    const source = after.find((c) => c.id === sourceId);
    const dest = after.find((c) => c.id === destId);

    expect(ok).toBe(true);
    expect(source?.root).toHaveLength(0);
    expect(dest?.root.find((n) => n.id === usersId)?.children?.[0]).toMatchObject({
      type: "request",
      name: "Login",
      id: requestId,
    });
  });

  it("updateRequest overwrites an existing request node in place", async () => {
    const store = useCollectionStore.getState();
    const id = (await store.addCollection("C")) as string;
    const nodeId = await store.addRequest(id, null, "Old", {
      name: "Old",
      method: "GET",
      url: "https://api.example.com/old",
      headers: [{ key: "X-A", value: "1", enabled: true, inherited: true }],
      params: [],
      body: "",
      bodyType: "none",
      auth: { type: "none" } as RequestConfig["auth"],
      multipart: [],
      formData: [],
      file: null,
      nameLocked: false,
    });
    expect(nodeId).toBeTruthy();

    const ok = await store.updateRequest(
      id,
      nodeId as string,
      {
        name: "New",
        method: "PUT",
        url: "https://api.example.com/new",
        headers: [
          { key: "X-A", value: "1", enabled: true, inherited: true },
          { key: "X-B", value: "2", enabled: true },
        ],
        params: [],
        body: '{"ok":true}',
        bodyType: "application/json",
        auth: { type: "none" } as RequestConfig["auth"],
        multipart: [],
        formData: [],
        file: null,
        nameLocked: true,
      },
      "Renamed",
    );
    const node = useCollectionStore.getState().collections[0].root[0];

    expect(ok).toBe(true);
    expect(node).toMatchObject({
      id: nodeId,
      name: "Renamed",
      method: "PUT",
      url: "https://api.example.com/new",
    });
    expect(node.request?.headers).toEqual([{ key: "X-B", value: "2", enabled: true }]);
    expect(node.request?.body).toBe('{"ok":true}');
  });

  it("findUniqueSavedRequest returns a single method+url match", async () => {
    const store = useCollectionStore.getState();
    const id = (await store.addCollection("C")) as string;
    await store.addRequest(id, null, "Login", {
      name: "Login",
      method: "POST",
      url: "https://api.example.com/login",
      headers: [],
      params: [],
      body: "",
      bodyType: "none",
      auth: { type: "none" } as RequestConfig["auth"],
      multipart: [],
      formData: [],
      file: null,
      nameLocked: false,
    });
    const collections = useCollectionStore.getState().collections;
    const hit = findUniqueSavedRequest(collections, "POST", "https://api.example.com/login");
    expect(hit?.collectionId).toBe(id);
    expect(hit?.nodeId).toBeTruthy();
    expect(findUniqueSavedRequest(collections, "GET", "https://api.example.com/login")).toBeNull();
  });
});
