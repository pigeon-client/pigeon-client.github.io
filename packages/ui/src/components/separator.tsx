import * as React from "react";
import { cn } from "../lib/cn";

export const Separator = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { orientation?: "horizontal" | "vertical" }
>(({ className, orientation = "horizontal", ...props }, ref) => {
  if (orientation === "vertical") {
    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        aria-hidden="true"
        className={cn("inline-block h-4 w-px shrink-0 bg-border", className)}
        {...(props as React.HTMLAttributes<HTMLDivElement>)}
      />
    );
  }
  return (
    <hr
      ref={ref as React.Ref<HTMLHRElement>}
      className={cn("h-px w-full shrink-0 border-0 bg-border", className)}
      {...(props as React.HTMLAttributes<HTMLHRElement>)}
    />
  );
});
Separator.displayName = "Separator";
