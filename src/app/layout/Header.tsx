import { Check, Search, Settings, Terminal, X } from "lucide-react";
import { type RefObject, useEffect, useState } from "react";
import pigeonLogo from "@/assets/pigeon-logo-32.png";
import { EnvSelector } from "@/features/environments";
import { getCachedUpdateResult, onUpdateCacheChange } from "@/features/settings";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";

interface HeaderProps {
  onOpenSettings: () => void;
  onExportCurl: () => void;
  onManageEnv: () => void;
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

  return (
    <div className="relative z-[var(--z-sticky)] flex h-11 flex-none items-center gap-2 border-b border-border bg-background/95 px-3.5 backdrop-blur">
      {/* Brand */}
      <div className="flex items-center gap-2.5 shrink-0">
        <img src={pigeonLogo} alt="Pigeon" className="h-7 w-7 rounded object-contain" />
        <span className="text-sm font-semibold tracking-tight max-sm:hidden">Pigeon</span>
      </div>

      <div className="flex-1" />

      {/* Search — centered */}
      <div
        className={cn(
          "relative flex h-8 w-[320px] shrink-0 items-center rounded border bg-card transition-colors",
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

      <div className="flex-1" />

      {/* Env selector + Export + Settings */}
      <div className="flex items-center gap-1.5 shrink-0">
        <EnvSelector onManage={onManageEnv} />
        <Button
          variant="ghost-icon"
          size="icon"
          onClick={onExportCurl}
          disabled={exportDisabled}
          title={curlCopied ? "Copied!" : "Copy as cURL"}
          aria-label="Copy as cURL"
        >
          {curlCopied ? (
            <Check className="h-4 w-4 text-status-2xx" />
          ) : (
            <Terminal className="h-4 w-4" />
          )}
        </Button>
        <Button variant="ghost-icon" size="icon" onClick={onOpenSettings} title="Settings (⌘,)">
          <span className="relative">
            <Settings className="h-4 w-4" />
            {updateAvailable && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
            )}
          </span>
        </Button>
      </div>
    </div>
  );
}
