import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu";
import type * as React from "react";
import { cn } from "../lib/cn";

/** Instant open — no fade, zoom, or slide (no right-to-left motion). */
const noMotion =
  "data-[starting-style]:opacity-100 data-[ending-style]:opacity-100 data-[starting-style]:transform-none data-[ending-style]:transform-none";

function ContextMenu(props: React.ComponentProps<typeof ContextMenuPrimitive.Root>) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />;
}

function ContextMenuTrigger(props: React.ComponentProps<typeof ContextMenuPrimitive.Trigger>) {
  return <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />;
}

function ContextMenuContent({
  className,
  align = "start",
  side = "bottom",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Popup> &
  Pick<
    React.ComponentProps<typeof ContextMenuPrimitive.Positioner>,
    "align" | "side" | "sideOffset"
  >) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Positioner
        className="isolate z-popover outline-none"
        align={align}
        side={side}
        sideOffset={sideOffset}
      >
        <ContextMenuPrimitive.Popup
          data-slot="context-menu-content"
          className={cn(
            "z-popover min-w-[190px] origin-top-left overflow-hidden rounded border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none",
            "animate-none duration-0 transition-none",
            noMotion,
            className,
          )}
          {...props}
        />
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  );
}

function ContextMenuItem({
  className,
  inset,
  variant = "default",
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <ContextMenuPrimitive.Item
      data-slot="context-menu-item"
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "relative flex cursor-default select-none items-center gap-2.5 rounded px-3 py-1.5 text-code outline-none",
        "focus:bg-accent focus:text-accent-foreground",
        "data-disabled:pointer-events-none data-disabled:opacity-50",
        "data-inset:pl-8",
        "data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive",
        "[&_svg]:pointer-events-none [&_svg]:size-[13px] [&_svg]:shrink-0 [&_svg]:opacity-75",
        className,
      )}
      {...props}
    />
  );
}

function ContextMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      data-slot="context-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

function ContextMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="context-menu-shortcut"
      className={cn("ml-auto pl-4 text-2xs tracking-widest text-muted-foreground", className)}
      {...props}
    />
  );
}

function ContextMenuGroup(props: React.ComponentProps<typeof ContextMenuPrimitive.Group>) {
  return <ContextMenuPrimitive.Group data-slot="context-menu-group" {...props} />;
}

export {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
};
