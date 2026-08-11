/**
 * Smoke tests for shared @pigeon/ui primitives — render + basic interaction
 * without adding a Testing Library dependency.
 */
import { Button, EmptyState, Input, Modal, Select, TabButton, Textarea } from "@pigeon/ui";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function mount(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root?.render(node);
  });
  return host;
}

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  host?.remove();
  root = null;
  host = null;
});

describe("@pigeon/ui primitives", () => {
  it("Button fires click and respects disabled", () => {
    const onClick = vi.fn();
    const el = mount(createElement(Button, { onClick }, "Save"));
    const btn = el.querySelector("button");
    expect(btn?.textContent).toBe("Save");
    act(() => {
      btn?.click();
    });
    expect(onClick).toHaveBeenCalledTimes(1);

    act(() => {
      root?.unmount();
    });
    host?.remove();
    const el2 = mount(createElement(Button, { onClick, disabled: true }, "Nope"));
    expect(el2.querySelector("button")?.disabled).toBe(true);
  });

  it("Input Select Textarea render form controls", () => {
    const el = mount(
      createElement(
        "div",
        null,
        createElement(Input, { "aria-label": "Name", defaultValue: "alpha" }),
        createElement(
          Select,
          { "aria-label": "Method", defaultValue: "GET" },
          createElement("option", { value: "GET" }, "GET"),
          createElement("option", { value: "POST" }, "POST"),
        ),
        createElement(Textarea, { "aria-label": "Body", defaultValue: "{}" }),
      ),
    );
    expect((el.querySelector('input[aria-label="Name"]') as HTMLInputElement).value).toBe("alpha");
    expect((el.querySelector('select[aria-label="Method"]') as HTMLSelectElement).value).toBe(
      "GET",
    );
    expect((el.querySelector('textarea[aria-label="Body"]') as HTMLTextAreaElement).value).toBe(
      "{}",
    );
  });

  it("Modal exposes dialog and backdrop close", () => {
    const onClose = vi.fn();
    const el = mount(
      createElement(Modal, { onClose, width: 320 }, createElement("div", null, "Hi")),
    );
    expect(el.querySelector('[role="dialog"]')).toBeTruthy();
    const backdrop = el.querySelector('[aria-label="Close modal"]') as HTMLElement;
    act(() => {
      backdrop.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("EmptyState action invokes callback", () => {
    const onClick = vi.fn();
    const el = mount(
      createElement(EmptyState, {
        icon: "📭",
        label: "Nothing here",
        action: { label: "Create", onClick },
      }),
    );
    const btn = el.querySelector("button");
    act(() => {
      btn?.click();
    });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("TabButton sets data-state when active", () => {
    const el = mount(createElement(TabButton, { active: true, variant: "sidebar" }, "History"));
    expect(el.querySelector("button")?.getAttribute("data-state")).toBe("active");
  });
});
