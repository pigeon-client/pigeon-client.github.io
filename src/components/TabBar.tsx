import { useState, useRef, useEffect } from 'react';
import { useTabStore } from '../store/tabStore';
import { Plus, X } from 'lucide-react';

export function TabBar() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const addTab = useTabStore((s) => s.addTab);
  const setTabName = useTabStore((s) => s.setTabName);

  const [editingId, setEditingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const stopEditing = () => setEditingId(null);

  return (
    <div className="flex items-center h-8 bg-bg-tertiary border-b border-border-primary shrink-0 overflow-x-auto">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          onMouseDown={(e) => { if (e.button === 1) closeTab(tab.id); }}
          className={`group relative flex items-center gap-1.5 px-3 h-full text-[11px] font-medium
            border-r border-border-primary cursor-pointer select-none shrink-0 max-w-[180px] transition-colors
            ${activeTabId === tab.id
              ? 'bg-bg-secondary text-text-primary'
              : 'bg-transparent text-text-tertiary hover:text-text-secondary hover:bg-bg-hover'
            }`}
        >
          {/* Status dot */}
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            tab.isLoading ? 'bg-accent-orange' :
            !tab.response ? 'opacity-0' :
            tab.response.status >= 200 && tab.response.status < 300 ? 'bg-accent-green' : 'bg-accent-red'
          }`} />

          {/* Name — span normally, input on double-click */}
          {editingId === tab.id ? (
            <input
              ref={inputRef}
              value={tab.name}
              onChange={(e) => setTabName(tab.id, e.target.value)}
              onBlur={stopEditing}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') stopEditing();
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-transparent border-none outline-none text-[11px] font-medium text-inherit min-w-0 truncate cursor-text"
            />
          ) : (
            <span
              onDoubleClick={(e) => { e.stopPropagation(); setEditingId(tab.id); }}
              className="flex-1 text-[11px] font-medium text-inherit min-w-0 truncate"
            >
              {tab.name}
            </span>
          )}

          {/* Close */}
          <button
            onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded cursor-pointer
              text-text-tertiary hover:text-text-primary transition-all shrink-0"
          >
            <X size={11} />
          </button>

          {/* Active underline */}
          {activeTabId === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-px bg-accent-orange" />
          )}
        </div>
      ))}

      {/* New tab */}
      <button
        onClick={() => addTab()}
        className="flex items-center justify-center w-8 h-full cursor-pointer
          text-text-tertiary hover:text-text-secondary hover:bg-bg-hover transition-colors shrink-0"
        title="New Tab"
      >
        <Plus size={13} />
      </button>
    </div>
  );
}
