import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
  cn,
  METHOD_COLORS,
} from "@pigeon/ui";
import { Copy, CopyX, Plus, Trash2, X } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useTabStore } from "../store";

function TabContextActions({ tabId }: { tabId: string }) {
  const addTab = useTabStore((s) => s.addTab);
  const duplicateTab = useTabStore((s) => s.duplicateTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const closeOther = useTabStore((s) => s.closeOtherTabs);
  const closeAll = useTabStore((s) => s.closeAllTabs);
  const tabCount = useTabStore((s) => s.tabs.length);

  return (
    <ContextMenuContent data-testid="tab-context-menu">
      <ContextMenuGroup>
        <ContextMenuItem
          onClick={() => {
            const id = addTab();
            setActiveTab(id);
          }}
        >
          <Plus />
          New Request
          <ContextMenuShortcut>⌘T</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={() => duplicateTab(tabId)}>
          <Copy />
          Duplicate Request
        </ContextMenuItem>
      </ContextMenuGroup>
      <ContextMenuSeparator />
      <ContextMenuGroup>
        <ContextMenuItem onClick={() => closeTab(tabId)}>
          <X />
          Close Tab
          <ContextMenuShortcut>⌘W</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem disabled={tabCount <= 1} onClick={() => closeOther(tabId)}>
          <CopyX />
          Close Other Tabs
        </ContextMenuItem>
        <ContextMenuItem variant="destructive" onClick={() => closeAll()}>
          <Trash2 />
          Close All Tabs
        </ContextMenuItem>
      </ContextMenuGroup>
    </ContextMenuContent>
  );
}

type SortableTabProps = {
  tabId: string;
  active: boolean;
  dragOver: boolean;
  children: React.ReactNode;
} & React.ComponentPropsWithoutRef<"div">;

const SortableTab = ({
  ref,
  tabId,
  active,
  dragOver,
  children,
  onClick,
  onKeyDown,
  onMouseDown,
  onPointerDown,
  className,
  style,
  ...rest
}: SortableTabProps & { ref?: React.Ref<HTMLDivElement> }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tabId,
  });
  const { onPointerDown: dndPointerDown, onKeyDown: dndKeyDown, ...dndRest } = listeners ?? {};

  return (
    <div
      {...rest}
      {...attributes}
      {...dndRest}
      ref={(node) => {
        setNodeRef(node);
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      role="tab"
      tabIndex={0}
      aria-selected={active}
      data-workspace-tab-id={tabId}
      onClick={onClick}
      onKeyDown={(event) => {
        dndKeyDown?.(event);
        onKeyDown?.(event);
      }}
      onMouseDown={onMouseDown}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        dndPointerDown?.(event);
      }}
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
        minWidth: 124,
        maxWidth: 210,
        height: 38,
        padding: "0 8px 0 13px",
        borderRight: "1px solid var(--border)",
        cursor: isDragging ? "grabbing" : "grab",
        background: active ? "var(--bg-base)" : "transparent",
        opacity: isDragging ? 0.5 : 1,
        borderLeft: dragOver ? "2px solid var(--primary)" : undefined,
        transform: CSS.Transform.toString(transform),
        transition: transition ?? "background 0.1s",
        touchAction: "none",
      }}
      className={cn(!active && "hover:bg-accent", className)}
    >
      {children}
    </div>
  );
};

export function TabStrip() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const reorderTabs = useTabStore((s) => s.reorderTabs);
  const addTab = useTabStore((s) => s.addTab);
  const setTabName = useTabStore((s) => s.setTabName);
  const updateTabRequest = useTabStore((s) => s.updateTabRequest);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const tabStripRef = useRef<HTMLDivElement>(null);
  const previousTabIdsRef = useRef<string[] | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const startRename = (tab: { id: string; name: string }) => {
    setEditingId(tab.id);
    setEditValue(tab.name);
    setTimeout(() => {
      renameInputRef.current?.select();
    }, 0);
  };

  const commitRename = (id: string) => {
    const v = editValue.trim();
    if (v) {
      // Named manually → lock; path changes no longer touch it.
      setTabName(id, v);
    } else {
      // Cleared → back to auto; name follows the URL path again.
      const tab = tabs.find((t) => t.id === id);
      updateTabRequest(id, { url: tab?.request.url ?? "", nameLocked: false });
    }
    setEditingId(null);
  };

  const clearDragState = () => {
    setDragOverTabId(null);
  };

  const handleDragStart = () => {
    setDragOverTabId(null);
  };

  const handleDragOver = ({ over }: DragOverEvent) => {
    setDragOverTabId(over ? String(over.id) : null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      reorderTabs(String(active.id), String(over.id));
    }
    clearDragState();
  };

  useEffect(() => {
    const strip = tabStripRef.current;
    if (!strip) return;

    const updateScrollButtons = () => {
      const maxScrollLeft = strip.scrollWidth - strip.clientWidth;
      setCanScrollLeft(strip.scrollLeft > 1);
      setCanScrollRight(maxScrollLeft - strip.scrollLeft > 1);
    };

    updateScrollButtons();
    strip.addEventListener("scroll", updateScrollButtons, { passive: true });
    const observer = new ResizeObserver(updateScrollButtons);
    observer.observe(strip);
    return () => {
      strip.removeEventListener("scroll", updateScrollButtons);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const previousTabIds = previousTabIdsRef.current;
    const currentTabIds = tabs.map((tab) => tab.id);
    previousTabIdsRef.current = currentTabIds;
    if (!previousTabIds) return;

    const newTabId = currentTabIds.find((id) => !previousTabIds.includes(id));
    if (!newTabId) return;

    const frame = requestAnimationFrame(() => {
      const newTab = Array.from(
        tabStripRef.current?.querySelectorAll<HTMLElement>("[data-workspace-tab-id]") ?? [],
      ).find((tab) => tab.dataset.workspaceTabId === newTabId);
      if (!newTab) return;
      newTab.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      newTab.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [tabs]);

  const scrollTabs = (direction: -1 | 1) => {
    const strip = tabStripRef.current;
    if (!strip) return;
    strip.scrollTo({
      left: direction < 0 ? 0 : strip.scrollWidth,
      behavior: "smooth",
    });
  };

  return (
    <div
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "stretch",
        height: 38,
        background: "var(--bg-surface)",
      }}
      className="pg-tab-strip-shell border-b border-border"
    >
      {(canScrollLeft || canScrollRight) && (
        <button
          type="button"
          aria-label="Scroll tabs left"
          aria-disabled={!canScrollLeft}
          title="Scroll tabs left"
          onClick={() => scrollTabs(-1)}
          className="pg-tab-scroll-button order-first"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      )}

      <div
        ref={tabStripRef}
        role="tablist"
        aria-label="Workspace tabs"
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "stretch",
          overflowX: "auto",
          overflowY: "hidden",
        }}
        className="pg-tab-strip"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={clearDragState}
        >
          <SortableContext
            items={tabs.map((tab) => tab.id)}
            strategy={horizontalListSortingStrategy}
          >
            {tabs.map((tab) => {
              const active = tab.id === activeTabId;
              const isEditing = editingId === tab.id;
              // Non-http tabs show a kind badge where the method usually sits.
              const badge =
                tab.kind === "mcp" ? "MCP" : tab.kind === "graphql" ? "GQL" : tab.request.method;
              const mc =
                tab.kind === "http"
                  ? (METHOD_COLORS[tab.request.method] ?? METHOD_COLORS.GET)
                  : "var(--primary)";
              return (
                <ContextMenu key={tab.id}>
                  <ContextMenuTrigger
                    render={(triggerProps) => (
                      <SortableTab
                        {...triggerProps}
                        tabId={tab.id}
                        active={active}
                        dragOver={dragOverTabId === tab.id}
                        onClick={(event) => {
                          triggerProps.onClick?.(event);
                          setActiveTab(tab.id);
                        }}
                        onKeyDown={(event) => {
                          triggerProps.onKeyDown?.(event);
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setActiveTab(tab.id);
                          }
                        }}
                        onMouseDown={(event) => {
                          triggerProps.onMouseDown?.(event);
                          if (event.button === 1) closeTab(tab.id);
                        }}
                      >
                        <span
                          style={{
                            flexShrink: 0,
                            fontFamily: "var(--font-mono)",
                            fontSize: "var(--text-2xs)",
                            fontWeight: 700,
                            letterSpacing: "0.03em",
                            color: mc,
                          }}
                        >
                          {badge}
                        </span>

                        {isEditing ? (
                          <input
                            ref={renameInputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => commitRename(tab.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                commitRename(tab.id);
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                setEditingId(null);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              fontFamily: "var(--font-mono)",
                              fontSize: "var(--text-xs)",
                              fontWeight: 600,
                              color: "var(--text-primary)",
                              background: "var(--bg-input)",
                              border: "1px solid var(--accent)",
                              borderRadius: "var(--radius)",
                              outline: "none",
                              padding: "1px 5px",
                              height: 22,
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              startRename(tab);
                            }}
                            style={{
                              flex: 1,
                              minWidth: 0,
                              fontFamily: "var(--font-mono)",
                              fontSize: "var(--text-xs)",
                              fontWeight: active ? 600 : 500,
                              color: active ? "var(--text-primary)" : "var(--text-secondary)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              background: "none",
                              border: "none",
                              cursor: "inherit",
                              padding: 0,
                              textAlign: "left",
                            }}
                          >
                            {tab.name}
                          </button>
                        )}

                        <button
                          type="button"
                          aria-label="Close tab"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            closeTab(tab.id);
                          }}
                          style={{
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 18,
                            height: 18,
                            borderRadius: "var(--radius)",
                            color: "var(--text-secondary)",
                            cursor: "pointer",
                          }}
                          className="hover:bg-[var(--border)] hover:text-[var(--text-primary)]"
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </SortableTab>
                    )}
                  />
                  <TabContextActions tabId={tab.id} />
                </ContextMenu>
              );
            })}
          </SortableContext>

          {/* New tab button */}
          <button
            type="button"
            onClick={() => {
              const id = addTab();
              setActiveTab(id);
            }}
            title="New request"
            style={{
              flexShrink: 0,
              width: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              borderRight: "1px solid var(--border)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            className="hover:text-[var(--text-primary)] hover:bg-accent"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </DndContext>
      </div>

      {(canScrollLeft || canScrollRight) && (
        <button
          type="button"
          aria-label="Scroll tabs right"
          aria-disabled={!canScrollRight}
          title="Scroll tabs right"
          onClick={() => scrollTabs(1)}
          className="pg-tab-scroll-button"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ── Main App ── */
