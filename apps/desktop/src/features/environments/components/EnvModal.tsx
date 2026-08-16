import { Button, cn, Input, Modal, ModalHeader, Switch } from "@pigeon/ui";
import { Check, Copy, Globe, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { KeyValue } from "@/shared/types";
import { selectActiveEnv, useEnvStore } from "../store";
import type { EnvVariable } from "../types";
import { GLOBALS_ID } from "../types";
import { VarKeyValueEditor } from "./VarKeyValueEditor";

interface EnvModalProps {
  onClose: () => void;
}

const blankVar = (): EnvVariable => ({ key: "", value: "", enabled: true, secret: false });

/** Trailing blank row so there's always an empty row to type into. */
function withBlank(vars: EnvVariable[]): EnvVariable[] {
  const last = vars[vars.length - 1];
  return !last || last.key || last.value ? [...vars, blankVar()] : vars;
}

export function EnvModal({ onClose }: EnvModalProps) {
  const environments = useEnvStore((s) => s.environments);
  const globals = useEnvStore((s) => s.globals);
  const activeEnvId = useEnvStore((s) => s.activeEnvId);
  const active = useEnvStore(selectActiveEnv);
  const {
    addEnvironment,
    renameEnvironment,
    deleteEnvironment,
    duplicateEnvironment,
    setVariables,
    setProduction,
    setActive,
    setGlobals,
  } = useEnvStore();

  const [selectedId, setSelectedId] = useState<string>(GLOBALS_ID);
  const [newName, setNewName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [editItems, setEditItems] = useState<KeyValue[]>([]);
  const newRef = useRef<HTMLInputElement>(null);

  const isGlobals = selectedId === GLOBALS_ID;
  const selectedEnv = environments.find((e) => e.id === selectedId) ?? null;
  const vars = isGlobals ? globals : (selectedEnv?.variables ?? []);

  // Fall back to Globals if the selected env is deleted.
  useEffect(() => {
    if (!(isGlobals || selectedEnv)) setSelectedId(GLOBALS_ID);
  }, [isGlobals, selectedEnv]);

  // Seed the editor (with a trailing blank) whenever the selection changes.
  useEffect(() => {
    setEditItems(withBlank(vars));
  }, [selectedId]);

  const commitVars = (items: KeyValue[]) => {
    setEditItems(items);
    const cleaned: EnvVariable[] = items
      .filter((v) => v.key.trim() || v.value.trim())
      .map((v) => ({ key: v.key, value: v.value, enabled: v.enabled, secret: !!v.secret }));
    if (isGlobals) setGlobals(cleaned);
    else if (selectedEnv) setVariables(selectedEnv.id, cleaned);
  };

  const rowError = (i: number): string | null => {
    const key = editItems[i]?.key.trim() ?? "";
    if (!key) return null;
    if (key.startsWith("$")) return "$ is reserved";
    if (editItems.findIndex((v) => v.key.trim() === key) !== i) return "Duplicate key";
    return null;
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const id = await addEnvironment(newName.trim());
    setNewName("");
    setSelectedId(id);
    setTimeout(() => newRef.current?.focus(), 0);
  };

  return (
    <Modal onClose={onClose} width={760}>
      <ModalHeader title="Environment Manager" onClose={onClose} />

      <div className="flex h-[460px] overflow-hidden">
        {/* Left — env list */}
        <div className="flex w-[240px] shrink-0 flex-col border-r border-border">
          <div className="flex flex-col gap-1.5 border-b border-border p-2.5">
            <Input
              ref={newRef}
              size="md"
              mono={false}
              autoComplete="off"
              spellCheck={false}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Environment name…"
            />
            <Button
              variant="default"
              size="xs"
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="h-8 w-full gap-1"
            >
              <Plus className="h-3 w-3" /> Add
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-1.5">
            {/* Globals — always present */}
            <ListRow
              icon={<Globe className="h-3.5 w-3.5 text-primary" />}
              label="Globals"
              count={globals.length}
              selected={isGlobals}
              onClick={() => setSelectedId(GLOBALS_ID)}
            />
            <div className="my-1 h-px bg-border" />

            {environments.length === 0 && (
              <div className="px-3 py-6 text-center text-2xs text-muted-foreground/70">
                No environments yet
              </div>
            )}
            {environments.map((env) => (
              <ListRow
                key={env.id}
                label={env.name}
                count={env.variables.length}
                selected={selectedId === env.id}
                active={env.id === activeEnvId}
                prod={env.isProduction}
                onClick={() => setSelectedId(env.id)}
              />
            ))}
          </div>
        </div>

        {/* Right — editor */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3">
            {isGlobals ? (
              <>
                <Globe className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Globals</span>
                <span className="text-2xs text-muted-foreground">
                  Shared across all environments
                </span>
              </>
            ) : selectedEnv ? (
              <>
                {renaming ? (
                  <Input
                    size="sm"
                    mono={false}
                    autoComplete="off"
                    spellCheck={false}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => {
                      renameEnvironment(selectedEnv.id, renameValue);
                      setRenaming(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        renameEnvironment(selectedEnv.id, renameValue);
                        setRenaming(false);
                      }
                      if (e.key === "Escape") setRenaming(false);
                    }}
                    className="max-w-[200px] font-semibold"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setRenaming(true);
                      setRenameValue(selectedEnv.name);
                    }}
                    className="text-sm font-semibold text-foreground"
                    title="Rename"
                  >
                    {selectedEnv.name}
                  </button>
                )}
                {active?.id === selectedEnv.id && (
                  <span className="rounded bg-primary/15 px-1.5 py-px text-2xs font-bold uppercase tracking-wide text-primary">
                    Active
                  </span>
                )}
                <div className="flex-1" />
                <span
                  className="flex items-center gap-1.5 text-2xs text-muted-foreground"
                  title="Marks this as production (red cues + send guardrails)"
                >
                  Production
                  <Switch
                    data-testid="env-prod-checkbox"
                    checked={selectedEnv.isProduction}
                    onCheckedChange={(v) => setProduction(selectedEnv.id, v)}
                  />
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => duplicateEnvironment(selectedEnv.id)}
                  title="Duplicate"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                {deleting ? (
                  <Button
                    variant="danger-filled"
                    size="xs"
                    onClick={() => {
                      deleteEnvironment(selectedEnv.id);
                      setDeleting(false);
                    }}
                  >
                    Confirm
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setDeleting(true)}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                {active?.id !== selectedEnv.id && (
                  <Button variant="default" size="xs" onClick={() => setActive(selectedEnv.id)}>
                    <Check className="h-3 w-3" /> Set active
                  </Button>
                )}
              </>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <VarKeyValueEditor
              items={editItems}
              onChange={commitVars}
              keyPlaceholder="VARIABLE_NAME"
              valuePlaceholder="value"
              keyClassName="text-foreground"
              testId="env"
              addLabel="Add variable"
              secret
              rowError={rowError}
            />
            <EnvUsageTable />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function EnvUsageTable() {
  const rows = [
    {
      token: "{{NAME}}",
      where: "URL, headers, body",
      note: "Active environment, then globals",
    },
    {
      token: "{{$uuid}}",
      where: "Any field",
      note: "Random UUID — new value each send",
    },
    {
      token: "{{$email}}",
      where: "Any field",
      note: "Random email — new value each send",
    },
    {
      token: "{{$firstName}}",
      where: "Any field",
      note: "Random first name — new value each send",
    },
    {
      token: "{{$lastName}}",
      where: "Any field",
      note: "Random last name — new value each send",
    },
  ] as const;

  return (
    <div className="mt-4 overflow-hidden rounded border border-border">
      <div className="border-b border-border bg-muted/20 px-3 py-2">
        <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
          Usage
        </span>
      </div>
      <table className="w-full border-collapse text-2xs">
        <thead>
          <tr className="border-b border-border/60 text-left text-muted-foreground">
            <th className="px-3 py-2 font-semibold uppercase tracking-wide">Token</th>
            <th className="px-3 py-2 font-semibold uppercase tracking-wide">Use in</th>
            <th className="px-3 py-2 font-semibold uppercase tracking-wide">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.token} className="border-b border-border/40 last:border-0">
              <td className="px-3 py-2 font-mono text-var-token">{row.token}</td>
              <td className="px-3 py-2 text-foreground">{row.where}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListRow({
  icon,
  label,
  count,
  selected,
  active,
  prod,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  count: number;
  selected: boolean;
  active?: boolean;
  prod?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mb-0.5 flex h-9 w-full items-center gap-2 rounded border-l-[3px] px-2.5 text-left text-code transition-colors",
        selected ? "border-primary bg-primary/5" : "border-transparent hover:bg-primary/5",
      )}
    >
      {icon ?? (
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            prod ? "bg-destructive" : "bg-primary",
          )}
        />
      )}
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{label}</span>
      <span className="shrink-0 text-2xs text-muted-foreground">{count}</span>
      {active && (
        <span className="shrink-0 rounded bg-primary/15 px-1.5 text-2xs font-bold uppercase text-primary">
          On
        </span>
      )}
    </button>
  );
}
