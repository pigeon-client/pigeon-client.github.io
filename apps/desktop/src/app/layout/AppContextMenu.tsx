import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@pigeon/ui";
import { ClipboardPaste, Copy, Scissors, TextSelect } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  type EditSnapshot,
  EMPTY_EDIT_SNAPSHOT,
  runCopy,
  runCut,
  runPaste,
  runSelectAll,
  snapshotEditTarget,
} from "@/shared/lib/contextMenuEdit";

/**
 * App-wide fallback context menu. Nested `ContextMenu` trees (workspace tabs)
 * stop the event, so they keep their own actions. Capture-phase preventDefault
 * hides the WKWebView native menu (Look Up / Inspect Element).
 */
export function AppContextMenu({ children }: { children: ReactNode }) {
  const snapRef = useRef<EditSnapshot>(EMPTY_EDIT_SNAPSHOT);
  const [snap, setSnap] = useState<EditSnapshot>(EMPTY_EDIT_SNAPSHOT);

  useEffect(() => {
    const suppressNative = (event: Event) => {
      event.preventDefault();
    };
    document.addEventListener("contextmenu", suppressNative, true);
    return () => document.removeEventListener("contextmenu", suppressNative, true);
  }, []);

  return (
    <ContextMenu
      onOpenChange={(open, details) => {
        if (!open) return;
        const target = "target" in details.event ? details.event.target : null;
        const next = snapshotEditTarget(target);
        snapRef.current = next;
        setSnap(next);
      }}
    >
      <ContextMenuTrigger
        data-testid="app-context-menu-trigger"
        className="fixed inset-0 flex flex-col overflow-hidden bg-background text-foreground"
        onContextMenu={(event) => {
          const target = event.target;
          if (!(target instanceof Element)) return;
          const nested = target.closest("[data-slot='context-menu-trigger']");
          if (nested && nested !== event.currentTarget) {
            event.preventBaseUIHandler();
          }
        }}
      >
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent data-testid="app-context-menu">
        <ContextMenuGroup>
          <ContextMenuItem disabled={!snap.canCut} onClick={() => runCut(snapRef.current)}>
            <Scissors />
            Cut
            <ContextMenuShortcut>⌘X</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem disabled={!snap.canCopy} onClick={() => runCopy(snapRef.current)}>
            <Copy />
            Copy
            <ContextMenuShortcut>⌘C</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem disabled={!snap.canPaste} onClick={() => runPaste(snapRef.current)}>
            <ClipboardPaste />
            Paste
            <ContextMenuShortcut>⌘V</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuItem
          disabled={!snap.canSelectAll}
          onClick={() => runSelectAll(snapRef.current)}
        >
          <TextSelect />
          Select All
          <ContextMenuShortcut>⌘A</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
