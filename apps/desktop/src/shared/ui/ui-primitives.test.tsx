/**
 * Smoke tests for shared @pigeon/ui primitives — render + basic interaction
 * without adding a Testing Library dependency.
 */
import { Button, EmptyState, Input, Modal, Select, TabButton, Textarea } from "@pigeon/ui";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function mount(node: ReactNode) {
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
  for (const el of document.body.querySelectorAll('[aria-label="Close modal"]')) {
    el.remove();
  }
  root = null;
  host = null;
});

describe("@pigeon/ui primitives", () => {
  it("Button fires click and respects disabled", () => {
    const onClick = vi.fn();
    const el = mount(<Button onClick={onClick}>Save</Button>);
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
    const el2 = mount(
      <Button onClick={onClick} disabled>
        Nope
      </Button>,
    );
    expect(el2.querySelector("button")?.disabled).toBe(true);
  });

  it("Input Select Textarea render form controls", () => {
    const el = mount(
      <div>
        <Input aria-label="Name" defaultValue="alpha" />
        <Select aria-label="Method" defaultValue="GET">
          <option value="GET">GET</option>
          <option value="POST">POST</option>
        </Select>
        <Textarea aria-label="Body" defaultValue="{}" />
      </div>,
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
    mount(
      <Modal onClose={onClose} width={320}>
        <div>Hi</div>
      </Modal>,
    );
    expect(document.body.querySelector('[role="dialog"]')).toBeTruthy();
    const backdrop = document.body.querySelector('[aria-label="Close modal"]') as HTMLElement;
    act(() => {
      backdrop.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("EmptyState action invokes callback", () => {
    const onClick = vi.fn();
    const el = mount(
      <EmptyState icon="📭" label="Nothing here" action={{ label: "Create", onClick }} />,
    );
    const btn = el.querySelector("button");
    act(() => {
      btn?.click();
    });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("TabButton sets data-state when active", () => {
    const el = mount(
      <TabButton active variant="sidebar">
        History
      </TabButton>,
    );
    expect(el.querySelector("button")?.getAttribute("data-state")).toBe("active");
  });
});
