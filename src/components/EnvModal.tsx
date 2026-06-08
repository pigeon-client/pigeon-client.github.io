import { useState } from 'react';
import { Button } from '@heroui/react';
import { useEnvStore } from '../store/envStore';
import { EmptyState } from './ui/EmptyState';
import { X, Globe, Plus, Edit3, Trash2, Check } from 'lucide-react';

interface EnvModalProps {
  onClose: () => void;
}

export function EnvModal({ onClose }: EnvModalProps) {
  const { environments, activeEnv, addEnvironment, setActiveEnv, updateEnvironment, deleteEnvironment } = useEnvStore();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editVars, setEditVars] = useState('');

  const handleAdd = () => {
    if (!newName.trim()) return;
    addEnvironment({ name: newName.trim(), variables: {} });
    setNewName('');
  };

  const handleEdit = (id: number) => {
    const env = environments.find((e) => e.id === id);
    if (!env) return;
    setEditingId(id);
    setEditVars(
      Object.entries(env.variables)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n')
    );
  };

  const handleSave = () => {
    if (editingId === null) return;
    const vars: Record<string, string> = {};
    editVars.split('\n').forEach((line) => {
      const t = line.trim();
      if (!t || t.startsWith('#')) return;
      const idx = t.indexOf('=');
      if (idx > 0) {
        vars[t.substring(0, idx).trim()] = t.substring(idx + 1).trim();
      }
    });
    updateEnvironment(editingId, { variables: vars });
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-modal-overlay" onClick={onClose}>
      <div
        className="bg-bg-secondary rounded-2xl shadow-lg w-[640px] max-h-[80vh] flex flex-col border border-border-primary"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-accent-blue" />
            <h2 className="text-sm font-semibold text-text-primary">Environment Manager</h2>
          </div>
          <Button isIconOnly variant="ghost" onPress={onClose}>
            <X size={18} />
          </Button>
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
              className="flex-1 px-3 py-2 text-sm bg-bg-secondary text-text-primary border border-border-primary rounded-lg
                placeholder:text-text-tertiary
                focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue
                transition-all duration-150"
            />
            <Button variant="primary" size="sm" onPress={handleAdd}>
              <Plus size={14} /> Add
            </Button>
          </div>

          {/* List */}
          {environments.length === 0 ? (
            <EmptyState
              icon={<Globe size={32} />}
              title="No environments yet"
              description="Create one above to start using variables like {{base_url}}"
            />
          ) : (
            <div className="space-y-3">
              {environments.map((env) => (
                <div key={env.id} className="border border-border-primary rounded-xl overflow-hidden">
                  {/* Header row */}
                  <div className="flex items-center justify-between px-4 py-3 bg-bg-hover">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setActiveEnv(activeEnv?.id === env.id ? null : env)}
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                          activeEnv?.id === env.id
                            ? 'border-accent-blue bg-accent-blue'
                            : 'border-border-primary'
                        }`}
                      >
                        {activeEnv?.id === env.id && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </button>
                      <span className="text-sm font-medium text-text-primary">{env.name}</span>
                      {activeEnv?.id === env.id && (
                        <span className="text-[10px] font-medium text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {editingId === env.id ? (
                        <Button variant="ghost" size="sm" onPress={handleSave}>
                          <Check size={14} /> Save
                        </Button>
                      ) : (
                        <Button isIconOnly variant="ghost" size="sm" onPress={() => handleEdit(env.id!)}>
                          <Edit3 size={14} />
                        </Button>
                      )}
                      <Button isIconOnly variant="ghost" size="sm" onPress={() => deleteEnvironment(env.id!)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>

                  {/* Variables editor */}
                  {editingId === env.id && (
                    <div className="px-4 py-3">
                      <textarea
                        value={editVars}
                        onChange={(e) => setEditVars(e.target.value)}
                        className="w-full h-32 p-3 text-xs font-mono bg-bg-primary text-text-primary border border-border-primary rounded-xl resize-none
                          focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue transition-all"
                        placeholder="BASE_URL=http://localhost:3000&#10;API_KEY=abc123"
                      />
                      <p className="mt-1.5 text-[10px] text-text-tertiary">
                        One variable per line. Lines starting with # are ignored. Use {'{{KEY}}'} in URLs.
                      </p>
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
