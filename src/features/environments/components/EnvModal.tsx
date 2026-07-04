import { Check, ChevronDown, Globe, Play, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { KeyValueEditor } from "@/features/request-builder";
import { parseEnvString } from "@/shared/lib/template";
import { cn } from "@/shared/lib/utils";
import type { KeyValue } from "@/shared/types";
import { Button } from "@/shared/ui/button";
import { Modal, ModalFooter, ModalHeader } from "@/shared/ui/Modal";
import { useEnvStore } from "../store";

interface EnvModalProps {
  onClose: () => void;
}

function toKeyValueItems(vars: Record<string, string>): KeyValue[] {
  const entries = Object.entries(vars);
  return entries.length === 0
    ? [{ key: "", value: "", enabled: true }]
    : entries.map(([k, v]) => ({ key: k, value: v, enabled: true }));
}

function fromKeyValueItems(items: KeyValue[]): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const item of items) {
    if (item.key.trim()) vars[item.key.trim()] = item.value;
  }
  return vars;
}

export function EnvModal({ onClose }: EnvModalProps) {
  const {
    environments,
    activeEnv,
    addEnvironment,
    updateEnvironment,
    deleteEnvironment,
    setActiveEnv,
  } = useEnvStore();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editItems, setEditItems] = useState<KeyValue[]>([]);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newName, setNewName] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const importMenuRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const newEnvInputRef = useRef<HTMLInputElement>(null);

  // Select first env when list changes
  useEffect(() => {
    if (!selectedId && environments.length > 0) {
      setSelectedId(environments[0].id ?? null);
    }
  }, [environments, selectedId]);

  // Close import menu on outside click
  useEffect(() => {
    if (!importMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (importMenuRef.current && !importMenuRef.current.contains(e.target as Node)) {
        setImportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [importMenuOpen]);

  // Load variables when the selected env changes
  useEffect(() => {
    const env = environments.find((e) => e.id === selectedId);
    if (env) {
      setEditItems(toKeyValueItems(env.variables));
      setTestResult(null);
    }
  }, [selectedId, environments]);

  const selectedEnv = environments.find((e) => e.id === selectedId);

  const handleAdd = () => {
    if (!newName.trim()) return;
    addEnvironment({ name: newName.trim(), variables: {} });
    setNewName("");
    setTimeout(() => newEnvInputRef.current?.focus(), 0);
  };

  const handleRename = (id: number) => {
    const env = environments.find((e) => e.id === id);
    if (!env) return;
    setRenamingId(id);
    setRenameValue(env.name);
    setTimeout(() => renameInputRef.current?.select(), 0);
  };

  const commitRename = () => {
    if (renamingId == null || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    updateEnvironment(renamingId, { name: renameValue.trim() });
    setRenamingId(null);
  };

  const handleSaveVariables = () => {
    if (selectedId == null) return;
    updateEnvironment(selectedId, { variables: fromKeyValueItems(editItems) });
  };

  const handleTestVariables = () => {
    if (!selectedEnv) return;
    const vars = fromKeyValueItems(editItems);
    const sample = Object.entries(vars).slice(0, 5);
    if (sample.length === 0) {
      setTestResult("No variables defined yet.");
      return;
    }
    setTestResult(
      sample.map(([k, v]) => `{{${k}}} → ${v}`).join("\n") +
        (Object.entries(vars).length > sample.length
          ? `\n… and ${Object.entries(vars).length - sample.length} more`
          : ""),
    );
  };

  const handleImportJson = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          if (!(parsed.name && parsed.variables)) {
            alert("Invalid JSON format. Expected { name, variables }");
            return;
          }
          addEnvironment({ name: parsed.name, variables: parsed.variables });
        } catch {
          alert("Failed to parse JSON file");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleImportEnvFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".env";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        const variables = parseEnvString(content);
        const name = file.name.replace(/\.env$/, "") || "Imported";
        addEnvironment({ name, variables });
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExportJson = () => {
    if (!selectedEnv) return;
    const json = JSON.stringify(selectedEnv, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    downloadBlob(blob, `${selectedEnv.name}.json`);
  };

  const handleExportEnv = () => {
    if (!selectedEnv) return;
    const vars = fromKeyValueItems(editItems);
    const content = Object.entries(vars)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    downloadBlob(blob, `${selectedEnv.name}.env`);
  };

  const handleDelete = (id: number) => {
    deleteEnvironment(id);
    if (selectedId === id) setSelectedId(null);
    setDeletingId(null);
  };

  return (
    <Modal onClose={onClose} width={720}>
      <ModalHeader title="Environment Manager" onClose={onClose} />

      <div className="flex max-h-[calc(80vh-120px)] flex-1 overflow-hidden">
        {/* Left panel — env list */}
        <div className="flex w-[220px] shrink-0 flex-col overflow-hidden border-r border-border">
          {/* Add new */}
          <div className="flex gap-1.5 border-b border-border px-2.5 py-2.5">
            <input
              ref={newEnvInputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Environment name…"
              className="h-8 flex-1 rounded border border-border bg-card px-2.5 font-[inherit] text-xs text-foreground outline-none focus:border-primary"
            />
            <Button
              variant="default"
              size="xs"
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="h-8 gap-1"
            >
              <Plus className="h-3 w-3" />
              Add
            </Button>
          </div>

          {/* Env list */}
          <div className="flex-1 overflow-y-auto p-1.5">
            {environments.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center text-muted-foreground">
                <Globe className="h-6 w-6 opacity-40" />
                <div className="text-xs font-medium">No environments</div>
                <div className="text-2xs text-muted-foreground/70">Create one above</div>
              </div>
            )}

            {environments.map((env) => {
              const isSelected = selectedId === env.id;
              const isActive = activeEnv?.id === env.id;
              const varCount = Object.keys(env.variables).length;
              const isRenaming = renamingId === env.id;

              return (
                <button
                  type="button"
                  key={env.id}
                  onClick={() => {
                    if (isRenaming) return;
                    setSelectedId(env.id ?? null);
                    if (selectedId != null && selectedId !== env.id) handleSaveVariables();
                  }}
                  className={cn(
                    "mb-0.5 flex h-11 w-full cursor-pointer items-center gap-2 rounded border-l-[3px] px-2.5 text-left transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-transparent hover:bg-primary/5",
                  )}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />

                  <div className="min-w-0 flex-1">
                    {isRenaming ? (
                      <input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitRename();
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            setRenamingId(null);
                          }
                        }}
                        className="h-5 w-full rounded border border-primary bg-card px-1.5 font-[inherit] text-code font-medium text-foreground outline-none"
                      />
                    ) : (
                      // biome-ignore lint/a11y/useSemanticElements: rename trigger kept as <span> so it stays inline with the env name; uses role+tabIndex+keyDown for keyboard access
                      <span
                        role="button"
                        tabIndex={0}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          env.id != null && handleRename(env.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "F2" && env.id != null) {
                            e.preventDefault();
                            handleRename(env.id);
                          }
                        }}
                        className="block truncate text-code font-medium text-foreground"
                      >
                        {env.name}
                      </span>
                    )}
                  </div>

                  <span className="shrink-0 text-2xs text-muted-foreground">{varCount}</span>

                  {isActive && (
                    <span className="shrink-0 rounded bg-primary/15 px-1.5 py-px text-2xs font-bold uppercase tracking-wide text-primary">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right panel — variable editor */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {selectedEnv ? (
            <>
              {/* Header */}
              <div className="border-b border-border px-5 pt-4 pb-3">
                <div className="mb-2.5 flex items-center gap-2.5">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span className="text-base font-semibold text-foreground">
                    {selectedEnv.name}
                  </span>
                  {activeEnv?.id === selectedEnv.id && (
                    <span className="rounded bg-primary/15 px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-primary">
                      Active
                    </span>
                  )}
                </div>

                {/* Action bar */}
                <div className="flex items-center gap-1.5">
                  {/* Import dropdown */}
                  <div ref={importMenuRef} className="relative">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setImportMenuOpen((v) => !v)}
                      aria-haspopup="menu"
                      aria-expanded={importMenuOpen}
                      className="gap-1"
                    >
                      <Upload className="h-3 w-3" />
                      Import
                      <ChevronDown className="h-2.5 w-2.5" />
                    </Button>
                    {importMenuOpen && (
                      <div
                        role="menu"
                        className="absolute left-0 top-[calc(100%+4px)] z-[var(--z-dropdown)] min-w-[170px] rounded border border-border bg-popover p-1 shadow-lg"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setImportMenuOpen(false);
                            handleImportJson();
                          }}
                          className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left font-[inherit] text-xs text-foreground hover:bg-accent"
                        >
                          <span className="font-mono text-2xs">.json</span>
                          <span className="text-2xs text-muted-foreground">Environment file</span>
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setImportMenuOpen(false);
                            handleImportEnvFile();
                          }}
                          className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left font-[inherit] text-xs text-foreground hover:bg-accent"
                        >
                          <span className="font-mono text-2xs">.env</span>
                          <span className="text-2xs text-muted-foreground">Dotenv file</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={handleImportJson}
                      className="h-6.5 gap-1 text-2xs"
                    >
                      .json
                    </Button>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={handleImportEnvFile}
                      className="h-6.5 gap-1 text-2xs"
                    >
                      .env
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleExportJson}
                    className="h-6.5 gap-1 text-2xs"
                  >
                    <DownloadIcon /> JSON
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleExportEnv}
                    className="h-6.5 gap-1 text-2xs"
                  >
                    <DownloadIcon /> .env
                  </Button>

                  <div className="flex-1" />

                  {deletingId === selectedEnv.id && selectedEnv.id != null ? (
                    <div className="flex items-center gap-1">
                      <span className="text-2xs text-muted-foreground">
                        Delete {selectedEnv.name}?
                      </span>
                      <Button
                        variant="danger-filled"
                        size="xs"
                        onClick={() => selectedEnv.id != null && handleDelete(selectedEnv.id)}
                        className="h-6 text-2xs"
                      >
                        Yes, Delete
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setDeletingId(null)}
                        className="h-6 text-2xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost-icon"
                      size="icon"
                      onClick={() => setDeletingId(selectedEnv.id ?? null)}
                      title="Delete"
                      className="h-7 w-7"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  {activeEnv?.id !== selectedEnv.id && (
                    <Button
                      variant="default"
                      size="xs"
                      onClick={() => setActiveEnv(selectedEnv)}
                      className="gap-1"
                    >
                      <Check className="h-3 w-3" /> Set as Active
                    </Button>
                  )}
                </div>
              </div>

              {/* Variable editor */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <KeyValueEditor
                  items={editItems}
                  onChange={setEditItems}
                  keyPlaceholder="VARIABLE_NAME"
                  valuePlaceholder="value"
                />

                <div className="mt-2.5">
                  <Button variant="ghost" size="xs" onClick={handleSaveVariables} className="gap-1">
                    <Check className="h-3 w-3" /> Save Variables
                  </Button>
                  <span className="ml-2.5 text-2xs text-muted-foreground">
                    Use <span className="font-mono">{"{{VARIABLE_NAME}}"}</span> in URLs, headers,
                    and body
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <span className="text-2xs text-muted-foreground">
                    Preview how variables resolve in request URLs.
                  </span>
                  <Button variant="ghost" size="xs" onClick={handleTestVariables} className="gap-1">
                    <Play className="h-3 w-3" /> Preview
                  </Button>
                </div>

                {testResult && (
                  <pre className="mt-2.5 overflow-x-auto whitespace-pre rounded border border-border bg-card px-3.5 py-2.5 font-mono text-xs text-muted-foreground">
                    {testResult}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-muted-foreground">
              <Globe className="h-8 w-8 opacity-30" />
              <div className="text-sm font-medium text-muted-foreground/80">
                {environments.length === 0
                  ? "No environments yet"
                  : "Select an environment to edit"}
              </div>
            </div>
          )}
        </div>
      </div>

      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
