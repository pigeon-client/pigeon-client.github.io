import { METHOD_COLORS } from "@pigeon/ui";
import { ChevronRight, FilePlus, FolderPlus, Pencil, Settings2, Trash2 } from "lucide-react";
import { useMemo } from "react";

/* ── File tree row ── */
interface TreeRowProps {
  depth: number;
  isFolder?: boolean;
  label: string;
  method?: string;
  meta?: string;
  expanded?: boolean;
  iconColor?: string;
  showCount?: boolean;
  count?: number;
  /** Folder rows only: shows a dot on the gear icon when set. */
  hasConfig?: boolean;
  /** Highlight as an active drop target. */
  dropActive?: boolean;
  /** Dim / grab cursor while this row is being dragged. */
  isDragging?: boolean;
  /** Show grab cursor (draggable request rows). */
  grab?: boolean;
  /** Ref from @dnd-kit useDraggable / useDroppable. */
  setRowRef?: (node: HTMLDivElement | null) => void;
  /** Spread onto the row (dnd-kit attributes + listeners). */
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
  onClick?: () => void;
  onDelete?: () => void;
  onRename?: () => void;
  onAddFolder?: () => void;
  onAddRequest?: () => void;
  /** Folder rows only: opens the folder's headers/auth config. */
  onEditConfig?: () => void;
}

export function TreeRow({
  depth,
  isFolder = false,
  label,
  method,
  meta,
  expanded,
  iconColor,
  showCount,
  count,
  hasConfig,
  dropActive = false,
  isDragging = false,
  grab = false,
  setRowRef,
  dragProps,
  onClick,
  onDelete,
  onRename,
  onAddFolder,
  onAddRequest,
  onEditConfig,
}: TreeRowProps) {
  const mc = method ? (METHOD_COLORS[method] ?? METHOD_COLORS.GET) : undefined;

  const depthGuides = useMemo(() => {
    const guides: React.ReactNode[] = [];
    for (let i = 0; i < depth; i++) {
      guides.push(
        <span
          key={`guide-${i}`}
          style={{
            flexShrink: 0,
            width: 14,
            alignSelf: "stretch",
            borderLeft: "1px solid var(--border)",
            marginLeft: 6,
          }}
        />,
      );
    }
    return guides;
  }, [depth]);

  const { style: dragStyle, ...restDragProps } = dragProps ?? {};

  return (
    <div
      ref={setRowRef}
      data-testid={dropActive ? "tree-row-drop-active" : undefined}
      {...restDragProps}
      role="treeitem"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={dropActive ? "group" : "group hover:bg-[var(--bg-elevated)]"}
      style={{
        display: "flex",
        alignItems: "center",
        height: 28,
        borderRadius: "var(--radius)",
        cursor: grab ? (isDragging ? "grabbing" : "grab") : "pointer",
        userSelect: "none",
        paddingLeft: 4 + depth * 14,
        paddingRight: 10,
        opacity: isDragging ? 0.45 : 1,
        background: dropActive
          ? "color-mix(in oklch, var(--primary) 18%, transparent)"
          : "transparent",
        outline: dropActive ? "1px solid var(--primary)" : undefined,
        outlineOffset: dropActive ? -1 : undefined,
        transition: "background 0.1s",
        margin: "0 4px",
        minWidth: depth >= 5 ? "max-content" : undefined,
        ...(dragStyle as React.CSSProperties | undefined),
      }}
    >
      {/* Depth guides */}
      {depthGuides}

      {isFolder ? (
        <>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              width: 16,
              color: "var(--text-secondary)",
              transform: expanded ? "rotate(90deg)" : "none",
              transition: "transform 120ms ease",
            }}
          >
            <ChevronRight size={12} strokeWidth={2.6} />
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke={iconColor ?? "var(--text-secondary)"}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ flexShrink: 0, marginRight: 7 }}
            aria-hidden="true"
            focusable="false"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              fontWeight: depth === 0 ? 600 : 500,
              color: depth === 0 ? "var(--text-primary)" : "var(--text-secondary)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {label}
          </span>
          {showCount && (
            <span
              style={{
                fontSize: "var(--text-2xs)",
                fontWeight: 600,
                color: "var(--text-secondary)",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "0 7px",
                marginLeft: 8,
                flexShrink: 0,
              }}
            >
              {count}
            </span>
          )}
          <span className="ml-1 hidden items-center gap-[3px] group-hover:flex">
            {onAddRequest && (
              <RowIconButton label="Add current request" onClick={onAddRequest}>
                <FilePlus size={12} />
              </RowIconButton>
            )}
            {onAddFolder && (
              <RowIconButton label="Add folder" onClick={onAddFolder}>
                <FolderPlus size={12} />
              </RowIconButton>
            )}
            {onEditConfig && (
              <RowIconButton
                label={hasConfig ? "Folder headers/auth (set)" : "Folder headers/auth"}
                onClick={onEditConfig}
              >
                <span className="relative flex items-center justify-center">
                  <Settings2 size={12} />
                  {hasConfig && (
                    <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </span>
              </RowIconButton>
            )}
            {onRename && (
              <RowIconButton label="Rename" onClick={onRename}>
                <Pencil size={11} />
              </RowIconButton>
            )}
            {onDelete && (
              <RowIconButton label="Delete" danger onClick={onDelete}>
                <Trash2 size={11} />
              </RowIconButton>
            )}
          </span>
        </>
      ) : (
        <>
          {/* Request row */}
          {method && mc ? (
            <>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 600,
                  color: mc,
                  flexShrink: 0,
                  width: 52,
                }}
              >
                {method}
              </span>
              <span
                style={{
                  flex: 1,
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {label}
              </span>
            </>
          ) : (
            <>
              <span style={{ flexShrink: 0, width: 17 }} />
              <span
                style={{
                  flex: 1,
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {label}
              </span>
            </>
          )}
          <span
            style={{
              flexShrink: 0,
              fontSize: "var(--text-2xs)",
              color: "var(--text-secondary)",
              paddingLeft: 8,
              whiteSpace: "nowrap",
            }}
          >
            {meta}
          </span>
          <span className="ml-1 hidden items-center gap-[3px] group-hover:flex">
            {onRename && (
              <RowIconButton label="Rename" onClick={onRename}>
                <Pencil size={11} />
              </RowIconButton>
            )}
            {onDelete && (
              <RowIconButton label="Delete" danger onClick={onDelete}>
                <Trash2 size={11} />
              </RowIconButton>
            )}
          </span>
        </>
      )}
    </div>
  );
}

export function RowIconButton({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseDown={(e) => {
        // Keep row drag from starting when using action buttons.
        e.stopPropagation();
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
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
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
      }}
      className={danger ? "hover:text-status-5xx" : "hover:text-primary"}
    >
      {children}
    </button>
  );
}
