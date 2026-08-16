import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { cn } from "../lib/cn";

export const ResizablePanelGroup = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Group>
>(({ className, ...props }, ref) => (
  <Group
    elementRef={ref}
    className={cn("flex h-full w-full data-[orientation=vertical]:flex-col", className)}
    {...props}
  />
));
ResizablePanelGroup.displayName = "ResizablePanelGroup";

export const ResizablePanel = Panel;

export const ResizableHandle = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof Separator> & { withHandle?: boolean }
>(({ className, withHandle, ...props }, ref) => (
  <Separator
    elementRef={ref}
    className={cn(
      "pg-resizable-handle relative flex h-full w-px items-center justify-center bg-transparent after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 outline-none aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:inset-x-0 aria-[orientation=horizontal]:after:top-1/2 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-auto aria-[orientation=horizontal]:after:-translate-y-1/2",
      className,
    )}
    {...props}
  >
    {withHandle && (
      <div className="pg-resizable-handle-grip z-10 rounded-full bg-muted-foreground" />
    )}
  </Separator>
));
ResizableHandle.displayName = "ResizableHandle";
