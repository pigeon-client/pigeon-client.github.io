import { cn, Menu } from "@pigeon/ui";
import { ChevronDown } from "lucide-react";
import type { RefObject } from "react";
import { HTTP_METHODS, methodTextClass } from "@/shared/lib/httpMethod";
import type { HttpMethod } from "@/shared/types";
import { MethodOption } from "./MethodOption";

export function MethodSelector({
  method,
  open,
  setOpen,
  dropdownRef,
  onSelect,
}: {
  method: HttpMethod;
  open: boolean;
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  dropdownRef: RefObject<HTMLDivElement | null>;
  onSelect: (method: HttpMethod) => void;
}) {
  const methodTriggerClass = methodTextClass(method);

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        type="button"
        data-testid="method-trigger"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 min-w-[104px] cursor-pointer items-center justify-between gap-2 rounded border bg-card px-3 font-mono text-code font-bold transition-colors",
          open ? "border-primary" : "border-border",
          methodTriggerClass,
        )}
      >
        <span>{method}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <Menu className="absolute left-0 top-10 w-[150px]">
          {HTTP_METHODS.map((m) => (
            <MethodOption
              key={m}
              method={m}
              active={m === method}
              onSelect={() => {
                onSelect(m);
                setOpen(false);
              }}
            />
          ))}
        </Menu>
      )}
    </div>
  );
}
