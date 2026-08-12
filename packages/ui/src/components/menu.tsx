import * as React from "react";
import { cn } from "../lib/cn";

/**
 * Floating menu / suggestion panel surface shared by method, env, body-type,
 * and variable autocomplete dropdowns.
 */
export const Menu = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="listbox"
      className={cn(
        "z-dropdown overflow-auto rounded border border-border bg-popover p-1 text-popover-foreground shadow-lg",
        className,
      )}
      {...props}
    />
  ),
);
Menu.displayName = "Menu";

export const MenuItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }
>(({ className, active, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    role="option"
    aria-selected={active}
    className={cn(
      "flex w-full cursor-pointer items-center rounded px-2 py-1.5 text-left text-xs transition-colors",
      active
        ? "bg-accent text-accent-foreground"
        : "text-foreground hover:bg-accent hover:text-accent-foreground",
      className,
    )}
    {...props}
  />
));
MenuItem.displayName = "MenuItem";
