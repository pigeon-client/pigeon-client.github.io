import { describe, expect, it } from "vitest";
import type { CollectionNode } from "../types";
import { findAncestors } from "./tree";

const tree: CollectionNode[] = [
  {
    id: "root",
    type: "folder",
    name: "root",
    children: [
      {
        id: "inner",
        type: "folder",
        name: "inner",
        children: [{ id: "req", type: "request", name: "req" }],
      },
      { id: "sibling-req", type: "request", name: "sibling" },
    ],
  },
];

describe("findAncestors", () => {
  it("returns root-first ancestor chain for a nested node", () => {
    expect(findAncestors(tree, "req").map((n) => n.id)).toEqual(["root", "inner"]);
  });

  it("returns an empty chain for a top-level node", () => {
    expect(findAncestors(tree, "root")).toEqual([]);
  });

  it("returns a single-folder chain for a direct child", () => {
    expect(findAncestors(tree, "sibling-req").map((n) => n.id)).toEqual(["root"]);
  });

  it("returns an empty chain when the id isn't found", () => {
    expect(findAncestors(tree, "missing")).toEqual([]);
  });
});
