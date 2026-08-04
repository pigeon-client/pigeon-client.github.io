import { methodTextClass } from "@/shared/lib/httpMethod";
import { cn } from "@/shared/lib/utils";
import type { HttpMethod } from "@/shared/types";

export function MethodOption({
  method,
  active,
  onSelect,
}: {
  method: HttpMethod;
  active: boolean;
  onSelect: () => void;
}) {
  const cls = methodTextClass(method);
  const dotCls = cls.replace("text-", "bg-");
  return (
    <button
      type="button"
      role="option"
      data-testid={`method-option-${method}`}
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        "flex h-7 w-full cursor-pointer items-center gap-2 rounded px-2 text-left font-mono text-xs font-semibold transition-colors",
        active ? "bg-accent text-foreground" : "text-foreground hover:bg-accent",
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotCls)} />
      <span className={cls}>{method}</span>
    </button>
  );
}
