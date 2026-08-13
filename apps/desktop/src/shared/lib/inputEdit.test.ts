// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { deleteText, insertText, replaceRange } from "./inputEdit";

describe("inputEdit", () => {
  it("insertText updates value and fires input", () => {
    const field = document.createElement("input");
    field.value = "hello";
    document.body.appendChild(field);
    field.setSelectionRange(5, 5);

    let seen = "";
    field.addEventListener("input", () => {
      seen = field.value;
    });

    insertText(field, "!");
    expect(field.value).toBe("hello!");
    expect(seen).toBe("hello!");
  });

  it("replaceRange replaces a span", () => {
    const field = document.createElement("textarea");
    field.value = "{{partial";
    document.body.appendChild(field);

    replaceRange(field, 0, field.value.length, "{{name}}");
    expect(field.value).toBe("{{name}}");
  });

  it("deleteText removes selected pair", () => {
    const field = document.createElement("textarea");
    field.value = "{}";
    document.body.appendChild(field);
    field.setSelectionRange(0, 2);

    deleteText(field, "backward");
    expect(field.value).toBe("");
  });
});
