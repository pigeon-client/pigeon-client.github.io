import { useEffect } from 'react';
import { KeyValue } from '../types';
import { Plus, X, Paperclip } from 'lucide-react';

interface KeyValueEditorProps {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  showFilePicker?: boolean;
  inputRefs?: React.MutableRefObject<(HTMLInputElement | null)[]>;
  suggestions?: string[];
  showForIndex?: number | null;
  activeIndex?: number;
  onKeyChange?: (index: number, value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent, index: number) => void;
  onKeyFocus?: (index: number) => void;
  onSelectSuggestion?: (index: number, value: string) => void;
}

export function KeyValueEditor({
  items,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = '',
  showFilePicker = false,
  inputRefs,
  suggestions,
  showForIndex,
  activeIndex = -1,
  onKeyChange,
  onKeyDown,
  onKeyFocus,
  onSelectSuggestion,
}: KeyValueEditorProps) {
  useEffect(() => {
    if (items.length === 0) {
      onChange([{ key: '', value: '', enabled: true }]);
    }
  }, []);

  const addRow = () => {
    onChange([...items, { key: '', value: '', enabled: true }]);
  };

  const update = (index: number, field: 'key' | 'value' | 'enabled', val: string | boolean) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: val } : item
    );
    if (index === items.length - 1 && field !== 'enabled' && val !== '') {
      const last = updated[updated.length - 1];
      if (last.key !== '' || last.value !== '') {
        onChange([...updated, { key: '', value: '', enabled: true }]);
        return;
      }
    }
    onChange(updated);
  };

  const remove = (index: number) => {
    if (items.length <= 1) {
      onChange([{ key: '', value: '', enabled: true }]);
      return;
    }
    onChange(items.filter((_, i) => i !== index));
  };

  const handleFilePick = (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const updated = items.map((item, i) =>
        i === index ? { ...item, isFile: true, file, fileName: file.name, value: file.name } : item
      );
      onChange(updated);
    };
    input.click();
  };

  return (
    <div className="border border-border-primary rounded-lg overflow-hidden">
      <div className="flex items-center px-2 py-1.5 text-[11px] font-medium text-text-secondary border-b border-border-primary bg-bg-hover/40">
        <span className="w-5 shrink-0" />
        <span className="flex-1 pl-1">Key</span>
      </div>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isEmpty = item.key === '' && item.value === '' && !item.isFile;
        return (
          <div key={`${index}`} className="relative">
            <div className="kv-row group">
              <button
                onClick={() => update(index, 'enabled', !item.enabled)}
                className={`checkbox-orange ${
                  item.enabled ? 'checkbox-orange-on' : 'checkbox-orange-off'
                }`}
              >
                {item.enabled && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>

              <div className="flex-1 relative">
                <input
                  ref={(el) => { if (inputRefs) inputRefs.current[index] = el; }}
                  type="text"
                  placeholder={keyPlaceholder}
                  value={item.key}
                  onChange={(e) => {
                    if (onKeyChange) {
                      onKeyChange(index, e.target.value);
                    } else {
                      update(index, 'key', e.target.value);
                    }
                  }}
                  onKeyDown={(e) => { onKeyDown?.(e, index); }}
                  onFocus={() => { onKeyFocus?.(index); }}
                  className={`w-full px-2 py-1 text-xs bg-transparent text-text-primary border-none
                    placeholder:text-text-tertiary/60 font-medium
                    focus:outline-none focus:ring-0
                    transition-all ${!item.enabled ? 'opacity-50' : ''}`}
                />
                {/* Suggestions dropdown */}
                {showForIndex === index && suggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-0.5 bg-bg-secondary border border-border-primary rounded-lg shadow-lg overflow-hidden">
                    {suggestions.map((s, i) => (
                      <button
                        key={s}
                        onMouseDown={(e) => { e.preventDefault(); onSelectSuggestion?.(index, s); }}
                        className={`w-full px-3 py-1.5 text-xs text-left font-mono transition-colors cursor-pointer ${
                          i === activeIndex
                            ? 'bg-accent-orange/20 text-accent-orange'
                            : 'text-text-primary hover:bg-bg-hover'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-[2] flex items-center gap-1">
                {showFilePicker && item.isFile && item.file ? (
                  <div className="flex items-center gap-2 flex-1 px-2 py-1 text-xs text-text-secondary truncate">
                    <Paperclip size={14} className="text-accent-orange shrink-0" />
                    <span className="truncate">{item.fileName}</span>
                    <span className="text-[10px] text-text-tertiary shrink-0">
                      ({(item.file.size / 1024).toFixed(1)} KB)
                    </span>
                    <button
                      onClick={() => {
                        const updated = items.map((it, i) =>
                          i === index ? { ...it, isFile: false, file: null, fileName: undefined, value: '' } : it
                        );
                        onChange(updated);
                      }}
                      className="text-[10px] text-accent-red hover:text-red-600 ml-auto"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder={valuePlaceholder}
                    value={item.value}
                    onChange={(e) => update(index, 'value', e.target.value)}
                    className={`flex-1 px-2 py-1 text-xs bg-transparent text-text-primary border-none
                      placeholder:text-text-tertiary/60 font-mono
                      focus:outline-none focus:ring-0
                      transition-all ${!item.enabled ? 'opacity-50' : ''}`}
                  />
                )}
                {showFilePicker && !item.isFile && (
                  <button
                    onClick={() => handleFilePick(index)}
                    className="btn-icon"
                    title="Attach file"
                  >
                    <Paperclip size={14} />
                  </button>
                )}
              </div>

              {isLast && isEmpty ? (
                <button
                  onClick={addRow}
                  className="w-6 h-6 shrink-0 flex items-center justify-center rounded text-text-tertiary hover:text-accent-orange hover:bg-bg-hover transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="Add row"
                >
                  <Plus size={14} />
                </button>
              ) : (
                <button
                  onClick={() => remove(index)}
                  className="w-6 h-6 shrink-0 flex items-center justify-center rounded text-text-tertiary hover:text-accent-red hover:bg-bg-hover transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="Remove"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}