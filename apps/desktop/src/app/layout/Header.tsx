import pigeonLogo from "@pigeon/brand/pigeon-mark.svg";
import { Button, Tooltip } from "@pigeon/ui";
import { Braces, Check, Globe, Plug, Search, Settings, Terminal, X } from "lucide-react";
import { type RefObject, useEffect, useState } from "react";
import { EnvSelector } from "@/features/environments";
import { getCachedUpdateResult, onUpdateCacheChange, type SettingsTab } from "@/features/settings";
import { cn } from "@/shared/lib/utils";
import type { WindowKind } from "@/shared/lib/windowKind";

interface HeaderProps {
  onOpenSettings: (tab?: SettingsTab) => void;
  onExportCurl: () => void;
  onManageEnv: () => void;
  onOpenRest: () => void;
  onOpenMcp: () => void;
  onOpenGraphql: () => void;
  activeWorkspace: WindowKind;
  curlCopied: boolean;
  exportDisabled: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchFocused: boolean;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
}

export function Header({
  onOpenSettings,
  onExportCurl,
  onManageEnv,
  onOpenRest,
  onOpenMcp,
  onOpenGraphql,
  activeWorkspace,
  curlCopied,
  exportDisabled,
  search,
  onSearchChange,
  searchInputRef,
  searchFocused,
  onSearchFocus,
  onSearchBlur,
}: HeaderProps) {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    setUpdateAvailable(getCachedUpdateResult()?.status === "available");
    return onUpdateCacheChange(() => {
      setUpdateAvailable(getCachedUpdateResult()?.status === "available");
    });
  }, []);

  const workspaceTabs: {
    kind: WindowKind;
    label: string;
    icon: typeof Globe;
    tooltip: string;
    ariaLabel: string;
    testId: string;
    onClick: () => void;
  }[] = [
    {
      kind: "rest",
      label: "REST",
      icon: Globe,
      tooltip: "REST workspace (⌘⇧R)",
      ariaLabel: "REST workspace",
      testId: "header-open-rest",
      onClick: onOpenRest,
    },
    {
      kind: "mcp",
      label: "MCP",
      icon: Plug,
      tooltip: "MCP — coming soon (⌘⇧M)",
      ariaLabel: "MCP (coming soon)",
      testId: "header-open-mcp",
      onClick: onOpenMcp,
    },
    {
      kind: "graphql",
      label: "GraphQL",
      icon: Braces,
      tooltip: "GraphQL — coming soon (⌘⇧G)",
      ariaLabel: "GraphQL (coming soon)",
      testId: "header-open-graphql",
      onClick: onOpenGraphql,
    },
  ];

  return (
    <div className="relative z-sticky grid h-11 flex-none grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border bg-background/95 px-3.5 backdrop-blur">
      {/* Brand */}
      <div className="flex items-center gap-2.5 justify-self-start">
        <img src={pigeonLogo} alt="Pigeon" className="h-7 w-7 rounded object-contain" />
        <span className="text-sm font-semibold tracking-tight max-sm:hidden">Pigeon</span>
      </div>

      {/* Search — truly centered between equal side columns */}
      <div
        className={cn(
          "relative flex h-8 w-[min(320px,40vw)] items-center rounded border bg-card transition-colors",
          searchFocused ? "border-primary" : "border-border",
        )}
      >
        <Search className="ml-2.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          ref={searchInputRef}
          data-header-search
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={onSearchFocus}
          onBlur={onSearchBlur}
          placeholder="Search…"
          className="h-full flex-1 bg-transparent px-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        {!(searchFocused || search) && (
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1 font-mono text-2xs leading-[1.6] text-muted-foreground">
            ⌘F
          </kbd>
        )}
      </div>

      {/* Env selector + Export + Settings — self-stretch so this whole grid cell fills
          the header's h-11 row (the outer grid's `items-center` would otherwise shrink-wrap
          and center it, capping the tab strip's own self-stretch below at that shorter height). */}
      <div className="flex items-center self-stretch justify-end gap-1.5 justify-self-end">
        <EnvSelector onManage={onManageEnv} />
        {/* self-stretch fills the header's own h-11 so each tab's border-bottom lands
            flush on the header's border-b — a real tab edge, not a floating underline. */}
        <div className="flex items-stretch self-stretch gap-0.5 border-r border-border pr-1.5 mr-0.5">
          {workspaceTabs.map(({ kind, label, icon: Icon, tooltip, ariaLabel, testId, onClick }) => {
            const active = activeWorkspace === kind;
            return (
              <Tooltip key={kind} label={tooltip}>
                <button
                  type="button"
                  onClick={onClick}
                  data-testid={testId}
                  aria-label={ariaLabel}
                  data-state={active ? "active" : "inactive"}
                  className={cn(
                    "flex items-center gap-1.5 border-b-2 px-2.5 text-xs font-medium transition-colors",
                    active
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="max-lg:hidden">{label}</span>
                </button>
              </Tooltip>
            );
          })}
        </div>
        <Tooltip label={curlCopied ? "Copied!" : "Copy as cURL"}>
          <Button
            variant="ghost-icon"
            size="icon"
            onClick={onExportCurl}
            disabled={exportDisabled}
            aria-label="Copy as cURL"
          >
            {curlCopied ? (
              <Check className="h-4 w-4 text-status-2xx" />
            ) : (
              <Terminal className="h-4 w-4" />
            )}
          </Button>
        </Tooltip>
        <Tooltip label="Settings (⌘,)">
          <Button
            variant="ghost-icon"
            size="icon"
            onClick={() => onOpenSettings(updateAvailable ? "About" : undefined)}
            aria-label="Settings"
          >
            <span className="relative">
              <Settings className="h-4 w-4" />
              {updateAvailable && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
              )}
            </span>
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
