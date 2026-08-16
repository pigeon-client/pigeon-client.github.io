// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { labelFromTarget, snapshotEditTarget } from "./contextMenuEdit";

describe("contextMenuEdit", () => {
  it("enables cut/copy/paste on a selected input", () => {
    const field = document.createElement("input");
    field.value = "hello";
    document.body.appendChild(field);
    field.setSelectionRange(0, 2);

    const snap = snapshotEditTarget(field);
    expect(snap.field).toBe(field);
    expect(snap.copyText).toBe("he");
    expect(snap.canCut).toBe(true);
    expect(snap.canCopy).toBe(true);
    expect(snap.canPaste).toBe(true);
    expect(snap.canSelectAll).toBe(true);
  });

  it("disables cut/paste on readonly fields but still copies a selection", () => {
    const field = document.createElement("input");
    field.value = "secret";
    field.readOnly = true;
    document.body.appendChild(field);
    field.setSelectionRange(0, 6);

    const snap = snapshotEditTarget(field);
    expect(snap.canCut).toBe(false);
    expect(snap.canPaste).toBe(false);
    expect(snap.canCopy).toBe(true);
    expect(snap.copyText).toBe("secret");
  });

  it("copies a compact label from a row button when nothing is selected", () => {
    const row = document.createElement("button");
    row.type = "button";
    row.textContent = "dummyjson.com";
    document.body.appendChild(row);

    expect(labelFromTarget(row)).toBe("dummyjson.com");
    const snap = snapshotEditTarget(row);
    expect(snap.canCopy).toBe(true);
    expect(snap.copyText).toBe("dummyjson.com");
    expect(snap.canCut).toBe(false);
    expect(snap.canPaste).toBe(false);
  });

  it("does not copy a huge panel", () => {
    const panel = document.createElement("div");
    panel.textContent = "x".repeat(400);
    document.body.appendChild(panel);
    const snap = snapshotEditTarget(panel);
    expect(snap.canCopy).toBe(false);
  });
});
