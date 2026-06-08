import { useState, useRef, useEffect } from 'react';
import { Header } from '../types';
import { KeyValueEditor } from './KeyValueEditor';
import { Eye } from 'lucide-react';

interface HeadersEditorProps {
  headers: Header[];
  onHeadersChange: (headers: Header[]) => void;
}

const COMMON_HEADERS = [
  'Content-Type', 'Accept', 'Authorization', 'Cache-Control', 'Cookie',
  'User-Agent', 'Referer', 'Origin', 'Accept-Language', 'Accept-Encoding',
  'If-None-Match', 'If-Modified-Since', 'X-Requested-With', 'X-API-Key',
  'X-Auth-Token', 'X-CSRF-Token',
];

const SYSTEM_HEADERS_COUNT = 9;

export function HeadersEditor({ headers, onHeadersChange }: HeadersEditorProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showForIndex, setShowForIndex] = useState<number | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKeyChange = (index: number, value: string) => {
    let updated = headers.map((h, i) => (i === index ? { ...h, key: value } : h));
    if (index === updated.length - 1 && value !== '') {
      const last = updated[updated.length - 1];
      if (last.key !== '' || last.value !== '') {
        updated = [...updated, { key: '', value: '', enabled: true }];
      }
    }
    onHeadersChange(updated);

    if (value.length > 0) {
      const filtered = COMMON_HEADERS.filter((h) => h.toLowerCase().startsWith(value.toLowerCase()));
      setSuggestions(filtered);
      setShowForIndex(filtered.length > 0 ? index : null);
      setActiveIndex(-1);
    } else {
      setSuggestions([]);
      setShowForIndex(null);
    }
  };

  const selectSuggestion = (index: number, header: string) => {
    const updated = headers.map((h, i) => (i === index ? { ...h, key: header } : h));
    onHeadersChange(updated);
    setSuggestions([]);
    setShowForIndex(null);
    inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (showForIndex !== index || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((p) => Math.min(p + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((p) => Math.max(p - 1, 0)); }
    else if (e.key === 'Enter' && activeIndex >= 0) { e.preventDefault(); selectSuggestion(index, suggestions[activeIndex]); }
    else if (e.key === 'Escape') { setShowForIndex(null); setSuggestions([]); }
  };

  const handleFocus = (index: number) => {
    const val = headers[index]?.key || '';
    if (val.length > 0) {
      const filtered = COMMON_HEADERS.filter((h) => h.toLowerCase().startsWith(val.toLowerCase()));
      setSuggestions(filtered);
      setShowForIndex(filtered.length > 0 ? index : null);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setShowForIndex(null);
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-2">
      {/* Section heading */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-text-secondary">Headers</span>
        <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
          <Eye size={12} />
          {SYSTEM_HEADERS_COUNT} hidden
        </span>
      </div>

      <KeyValueEditor
        items={headers}
        onChange={onHeadersChange}
        keyPlaceholder="Key"
        valuePlaceholder="Value"
        inputRefs={inputRefs}
        onKeyChange={handleKeyChange}
        onKeyDown={handleKeyDown}
        onKeyFocus={handleFocus}
        suggestions={suggestions}
        showForIndex={showForIndex}
        activeIndex={activeIndex}
        onSelectSuggestion={selectSuggestion}
      />
    </div>
  );
}
