import { Check, Edit3, Globe, Play, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useEnvStore } from "../store/envStore";
import type { KeyValue } from "../types";
import { Modal, ModalFooter, ModalHeader } from "./ImportModal";
import { KeyValueEditor } from "./KeyValueEditor";
import { Button } from "./ui/Button";

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
    setActiveEnv,
    updateEnvironment,
    deleteEnvironment,
  } = useEnvStore();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editItems, setEditItems] = useState<KeyValue[]>([]);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newName.trim()) return;
    addEnvironment({ name: newName.trim(), variables: {} });
    setNewName("");
  };

  const handleEdit = (id: number) => {
    const env = environments.find((e) => e.id === id);
    if (!env) return;
    setEditingId(id);
    setEditItems(toKeyValueItems(env.variables));
    setTestResult(null);
  };

  const handleSave = () => {
    if (editingId === null) return;
    updateEnvironment(editingId, { variables: fromKeyValueItems(editItems) });
    setEditingId(null);
  };

  const handleTestVariables = () => {
    if (editingId === null) return;
    const vars = fromKeyValueItems(editItems);
    const sample = Object.entries(vars).slice(0, 3);
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

  return (
    <Modal onClose={onClose} width={680}>
      <ModalHeader title="Environment Manager" onClose={onClose} />

      <div style={{ flex: 1, overflowY: "auto", padding: "20px", maxHeight: "calc(80vh - 120px)" }}>
        {/* Add new */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="New environment name…"
            style={{
              flex: 1,
              height: 38,
              background: "var(--bg-input)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "0 14px",
              fontSize: 13,
              color: "var(--text-primary)",
              fontFamily: "inherit",
              outline: "none",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          />
          <Button
            variant="elevated"
            size="sm"
            onClick={handleAdd}
            disabled={!newName.trim()}
            style={{ gap: 7 }}
          >
            <Plus size={14} /> Add
          </Button>
        </div>

        {/* Empty state */}
        {environments.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "48px 24px",
              gap: 12,
              color: "var(--text-secondary)",
            }}
          >
            <Globe size={28} style={{ opacity: 0.4 }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 13.5, fontWeight: 500, margin: "0 0 4px" }}>
                No environments yet
              </p>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
                Create one above and use{" "}
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                  {"{{base_url}}"}
                </span>{" "}
                in requests
              </p>
            </div>
          </div>
        )}

        {/* Env list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {environments.map((env) => {
            const isActive = activeEnv?.id === env.id;
            const isEditing = editingId === env.id;
            const varCount = Object.keys(env.variables).length;

            return (
              <div
                key={env.id}
                style={{
                  border: `1px solid ${isActive ? "rgba(124,110,250,0.3)" : "var(--border)"}`,
                  borderRadius: 10,
                  overflow: "hidden",
                  background: isActive ? "rgba(124,110,250,0.04)" : "transparent",
                }}
              >
                {/* Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0 14px",
                    height: 48,
                    background: "var(--bg-input)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Active radio */}
                    <button
                      type="button"
                      onClick={() => setActiveEnv(isActive ? null : env)}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        border: `2px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                        background: isActive ? "var(--accent)" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        flexShrink: 0,
                        transition: "all 0.1s",
                      }}
                    >
                      {isActive && (
                        <div
                          style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }}
                        />
                      )}
                    </button>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                      {env.name}
                    </span>
                    <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                      {varCount} variable{varCount !== 1 ? "s" : ""}
                    </span>
                    {isActive && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--accent)",
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          background: "rgba(124,110,250,0.16)",
                          padding: "2px 8px",
                          borderRadius: 4,
                        }}
                      >
                        Active
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {isEditing ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={handleSave}
                        style={{ color: "#4ADE80", borderColor: "rgba(74,222,128,0.3)", gap: 5 }}
                      >
                        <Check size={13} /> Save
                      </Button>
                    ) : (
                      <Button
                        variant="ghost-icon"
                        size="icon"
                        onClick={() => env.id != null && handleEdit(env.id)}
                        title="Edit variables"
                        style={{ width: 28, height: 28 }}
                      >
                        <Edit3 size={13} />
                      </Button>
                    )}
                    <Button
                      variant="ghost-icon"
                      size="icon"
                      onClick={() => env.id != null && deleteEnvironment(env.id)}
                      title="Delete"
                      style={{ width: 28, height: 28 }}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>

                {/* Variable editor */}
                {isEditing && (
                  <div
                    style={{
                      padding: "14px 18px",
                      borderTop: "1px solid var(--border)",
                      background: "var(--bg-base)",
                    }}
                  >
                    <KeyValueEditor
                      items={editItems}
                      onChange={setEditItems}
                      keyPlaceholder="VARIABLE_NAME"
                      valuePlaceholder="value"
                    />
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: 12,
                      }}
                    >
                      <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                        Use{" "}
                        <span
                          style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}
                        >
                          {"{{VARIABLE_NAME}}"}
                        </span>{" "}
                        in URLs and headers
                      </span>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={handleTestVariables}
                        style={{ gap: 6 }}
                      >
                        <Play size={11} /> Preview
                      </Button>
                    </div>
                    {testResult && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: "10px 14px",
                          background: "var(--bg-input)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          whiteSpace: "pre",
                          overflowX: "auto",
                        }}
                      >
                        {testResult}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
