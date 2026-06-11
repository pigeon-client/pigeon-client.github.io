import { useState } from 'react';
import { useEnvStore } from '../store/envStore';
import { KeyValueEditor } from './KeyValueEditor';
import { KeyValue } from '../types';
import { X, Globe, Plus, Edit3, Trash2, Check, Play } from 'lucide-react';

interface EnvModalProps {
  onClose: () => void;
}

function toKeyValueItems(vars: Record<string, string>): KeyValue[] {
  const entries = Object.entries(vars);
  return entries.length === 0
    ? [{ key: '', value: '', enabled: true }]
    : entries.map(([k, v]) => ({ key: k, value: v, enabled: true }));
}

function fromKeyValueItems(items: KeyValue[]): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const item of items) {
    if (item.key.trim()) {
      vars[item.key.trim()] = item.value;
    }
  }
  return vars;
}

export function EnvModal({ onClose }: EnvModalProps) {
  const { environments, activeEnv, addEnvironment, setActiveEnv, updateEnvironment, deleteEnvironment } = useEnvStore();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editItems, setEditItems] = useState<KeyValue[]>([]);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newName.trim()) return;
    addEnvironment({ name: newName.trim(), variables: {} });
    setNewName('');
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && editingId !== null) {
      handleSave();
    }
  };

  const handleTestVariables = () => {
    if (editingId === null) return;
    const env = environments.find((e) => e.id === editingId);
    if (!env) return;
    const vars = fromKeyValueItems(editItems);
    const sample = Object.entries(vars).slice(0, 3);
    if (sample.length === 0) {
      setTestResult('No variables to test. Add some variables first.');
      return;
    }
    setTestResult(
      sample.map(([k, v]) => `{{${k}}} → ${v}`).join('\n') +
      (sample.length < Object.entries(vars).length ? `\n... and ${Object.entries(vars).length - sample.length} more` : '')
    );
  };

  return (
    <div className="backdrop" onClick={onClose} onKeyDown={handleKeyDown}>
      <div
        className="modal-card w-[640px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-accent-blue" />
            <h2 className="text-sm font-semibold text-text-primary">Environment Manager</h2>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Add new */}
          <div className="flex gap-2 mb-6">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New environment name"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="input-base"
            />
            <button onClick={handleAdd} className="btn-primary shrink-0">
              <Plus size={14} /> Add
            </button>
          </div>

          {/* Environment list */}
          {environments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Globe size={32} className="text-text-tertiary mb-3" />
              <p className="text-sm text-text-secondary mb-1">No environments yet</p>
              <p className="text-xs text-text-tertiary">Create one above to start using variables like {'{{base_url}}'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {environments.map((env) => (
                <div key={env.id} className="border border-border-primary rounded-lg overflow-hidden">
                  {/* Header row */}
                  <div className="flex items-center justify-between px-4 py-3 bg-bg-hover">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveEnv(activeEnv?.id === env.id ? null : env)}
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
                          activeEnv?.id === env.id
                            ? 'border-accent-orange bg-accent-orange'
                            : 'border-border-primary'
                        }`}
                      >
                        {activeEnv?.id === env.id && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </button>
                      <span className="text-sm font-medium text-text-primary">{env.name}</span>
                      <span className="text-[10px] text-text-tertiary">
                        ({Object.keys(env.variables).length} variables)
                      </span>
                      {activeEnv?.id === env.id && (
                        <span className="badge-warning text-[10px] px-2 py-0.5">Active</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {editingId === env.id ? (
                        <button onClick={handleSave} className="btn-ghost text-accent-green bg-accent-green/10 hover:bg-accent-green/20">
                          <Check size={14} /> Save
                        </button>
                      ) : (
                        <button onClick={() => handleEdit(env.id!)} className="btn-icon" title="Edit">
                          <Edit3 size={14} />
                        </button>
                      )}
                      <button onClick={() => deleteEnvironment(env.id!)} className="btn-icon-danger" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Variables editor (table) */}
                  {editingId === env.id && (
                    <div className="px-4 py-3">
                      <KeyValueEditor
                        items={editItems}
                        onChange={setEditItems}
                        keyPlaceholder="Variable name (e.g. BASE_URL)"
                        valuePlaceholder="Variable value"
                      />
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-[10px] text-text-tertiary">
                          Use {'{{VARIABLE_NAME}}'} in URLs and headers
                        </p>
                        <button onClick={handleTestVariables} className="btn-ghost text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20">
                          <Play size={11} /> Test Variables
                        </button>
                      </div>
                      {testResult && (
                        <div className="mt-2 p-2 bg-bg-code border border-border-primary rounded text-[11px] font-mono text-text-primary whitespace-pre">
                          {testResult}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
