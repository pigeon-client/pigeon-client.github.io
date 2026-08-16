import { cn, Menu } from "@pigeon/ui";
import { AlertTriangle, Check, ChevronDown, Globe, Settings2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { selectActiveEnv, useEnvStore } from "../store";

/** Header dropdown to see + switch the active environment (R2). Turns red when a
    production environment is active (R4). "Manage" opens the full modal. */
export function EnvSelector({ onManage }: { onManage: () => void }) {
  const environments = useEnvStore((s) => s.environments);
  const activeEnvId = useEnvStore((s) => s.activeEnvId);
  const setActive = useEnvStore((s) => s.setActive);
  const active = useEnvStore(selectActiveEnv);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const prod = active?.isProduction ?? false;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        data-testid="env-selector"
        onClick={() => setOpen((o) => !o)}
        title="Active environment"
        className={cn(
          "flex h-8 w-[160px] items-center gap-1.5 rounded border px-2.5 text-xs transition-colors",
          prod
            ? "border-destructive/50 bg-destructive/10 text-destructive"
            : open
              ? "border-primary text-foreground"
              : "border-border text-muted-foreground hover:text-foreground",
        )}
      >
        {prod ? (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <Globe className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate text-left font-medium">
          {active?.name ?? "No environment"}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
      </button>

      {open && (
        <Menu className="absolute right-0 top-9 w-[220px]">
          <EnvOption
            label="No environment"
            active={activeEnvId === null}
            testId="env-option-none"
            onClick={() => {
              setActive(null);
              setOpen(false);
            }}
          />
          {environments.map((env) => (
            <EnvOption
              key={env.id}
              label={env.name}
              prod={env.isProduction}
              active={env.id === activeEnvId}
              testId={`env-option-${env.name}`}
              onClick={() => {
                setActive(env.id);
                setOpen(false);
              }}
            />
          ))}
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onManage();
            }}
            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Manage environments…
          </button>
        </Menu>
      )}
    </div>
  );
}

function EnvOption({
  label,
  active,
  prod,
  testId,
  onClick,
}: {
  label: string;
  active: boolean;
  prod?: boolean;
  testId: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent",
        active ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {prod ? (
        <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" />
      ) : (
        <span className="w-3 shrink-0" />
      )}
      <span className="flex-1 truncate">{label}</span>
      {active && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
    </button>
  );
}
