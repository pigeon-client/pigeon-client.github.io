import { useRef, useEffect, useCallback, useState } from 'react';
import { BodyType, KeyValue } from '../types';
import { KeyValueEditor } from './KeyValueEditor';
import { useAutoClose } from '../hooks/useAutoClose';
import { ChevronDown, Wand2 } from 'lucide-react';

interface BodyEditorProps {
  bodyType: BodyType;
  body: string;
  formData: KeyValue[];
  multipart: KeyValue[];
  file: File | null;
  onBodyChange: (body: string) => void;
  onFormDataChange: (data: KeyValue[]) => void;
  onBodyTypeChange: (type: BodyType) => void;
  onMultipartChange: (data: KeyValue[]) => void;
  onFileChange: (file: File | null) => void;
}

type RadioId = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'binary';

const RAW_FORMATS: { label: string; value: BodyType }[] = [
  { label: 'Text', value: 'text/plain' },
  { label: 'XML', value: 'text/xml' },
];

const RADIOS: { id: RadioId; label: string }[] = [
  { id: 'none', label: 'none' },
  { id: 'json', label: 'JSON' },
  { id: 'form-data', label: 'form-data' },
  { id: 'x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
  { id: 'raw', label: 'raw' },
  { id: 'binary', label: 'binary' },
];

function getActiveRadio(bodyType: BodyType): RadioId {
  if (bodyType === 'none') return 'none';
  if (bodyType === 'application/json') return 'json';
  if (bodyType === 'multipart/form-data') return 'form-data';
  if (bodyType === 'application/x-www-form-urlencoded') return 'x-www-form-urlencoded';
  if (['text/plain', 'text/xml'].includes(bodyType)) return 'raw';
  if (bodyType === 'application/octet-stream') return 'binary';
  return 'none';
}

export function BodyEditor({
  bodyType,
  body,
  formData,
  multipart,
  file,
  onBodyChange,
  onFormDataChange,
  onBodyTypeChange,
  onMultipartChange,
  onFileChange,
}: BodyEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumRef = useRef<HTMLDivElement>(null);
  const { handleKeyDown } = useAutoClose(textareaRef);

  const activeRadio = getActiveRadio(bodyType);

  const [rawFormat, setRawFormat] = useState<BodyType>(
    ['text/plain', 'text/xml'].includes(bodyType) ? bodyType : 'text/plain'
  );

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.addEventListener('keydown', handleKeyDown);
    return () => el.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, bodyType]);

  const handleRadioSelect = (id: RadioId) => {
    if (id === 'none') onBodyTypeChange('none');
    else if (id === 'json') onBodyTypeChange('application/json');
    else if (id === 'form-data') onBodyTypeChange('multipart/form-data');
    else if (id === 'x-www-form-urlencoded') onBodyTypeChange('application/x-www-form-urlencoded');
    else if (id === 'raw') onBodyTypeChange(rawFormat);
    else if (id === 'binary') onBodyTypeChange('application/octet-stream');
  };

  const handleRawFormatChange = (fmt: BodyType) => {
    setRawFormat(fmt);
    onBodyTypeChange(fmt);
  };

  const formatJson = () => {
    if (bodyType === 'application/json' && body) {
      try { onBodyChange(JSON.stringify(JSON.parse(body), null, 2)); } catch {}
    }
  };

  const isJson = bodyType === 'application/json';
  const lineCount = body ? body.split('\n').length : 1;

  // Sync scroll between textarea and line numbers
  const handleScroll = useCallback(() => {
    if (lineNumRef.current && textareaRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const isCodeEditor = activeRadio === 'json' || activeRadio === 'raw';

  return (
    <div className="space-y-3">
      {/* Radio row */}
      <div className="flex items-center gap-4 flex-wrap">
        {RADIOS.map((r) => {
          const active = activeRadio === r.id;
          return (
            <button
              key={r.id}
              onClick={() => handleRadioSelect(r.id)}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <span
                className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                style={{ borderColor: active ? 'var(--accent-orange)' : 'var(--text-tertiary)' }}
              >
                {active && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-orange)' }} />
                )}
              </span>
              {r.label}
            </button>
          );
        })}

        {/* JSON: Beautify button */}
        {activeRadio === 'json' && (
          <button
            onClick={formatJson}
              className="btn-ghost"
          >
            <Wand2 size={12} />
            Beautify
          </button>
        )}

        {/* Raw: sub-format dropdown */}
        {activeRadio === 'raw' && (
          <div className="relative flex items-center">
            <select
              value={rawFormat}
              onChange={(e) => handleRawFormatChange(e.target.value as BodyType)}
              className="appearance-none pl-2.5 pr-6 py-0.5 text-xs bg-bg-hover text-text-primary
                border border-border-primary rounded cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-orange/30"
            >
              {RAW_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <ChevronDown size={11} className="absolute right-1.5 pointer-events-none text-text-tertiary" />
          </div>
        )}
      </div>

      {/* none */}
      {activeRadio === 'none' && (
        <div className="py-10 text-center text-xs text-text-tertiary">
          This request does not have a body
        </div>
      )}

      {/* JSON or raw: line-numbered code editor */}
      {isCodeEditor && (
        <div className="flex border border-border-primary rounded-lg overflow-hidden bg-bg-code min-h-[200px] max-h-[400px]">
          {/* Line numbers */}
          <div
            ref={lineNumRef}
            className="py-3 px-2 text-right text-xs font-mono leading-[1.6] select-none
              text-text-tertiary bg-bg-hover border-r border-border-primary overflow-hidden shrink-0"
            style={{ minWidth: '40px' }}
          >
            {Array.from({ length: Math.max(lineCount, 1) }, (_, i) => (
              <div key={i} style={{ height: '1.6em', lineHeight: '1.6' }}>{i + 1}</div>
            ))}
          </div>

          {/* Textarea (single, no overlay) */}
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            onScroll={handleScroll}
            placeholder={isJson ? '{\n  "key": "value"\n}' : 'Enter request body...'}
            className="flex-1 p-3 text-xs font-mono leading-[1.6] bg-transparent text-text-primary
              border-none resize-none focus:outline-none focus:ring-0
              placeholder:text-text-tertiary"
            spellCheck={false}
            style={{ tabSize: 2 }}
          />
        </div>
      )}

      {/* x-www-form-urlencoded */}
      {activeRadio === 'x-www-form-urlencoded' && (
        <KeyValueEditor
          items={formData}
          onChange={onFormDataChange}
          keyPlaceholder="Key"
          valuePlaceholder="Value"
        />
      )}

      {/* form-data (multipart) */}
      {activeRadio === 'form-data' && (
        <KeyValueEditor
          items={multipart}
          onChange={onMultipartChange}
          keyPlaceholder="Key"
          valuePlaceholder="Value"
          showFilePicker
        />
      )}

      {/* binary */}
      {activeRadio === 'binary' && (
        <div className="pt-1 flex items-center gap-3">
          <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary
            border border-border-primary rounded cursor-pointer hover:bg-bg-hover transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {file ? file.name : 'Select File'}
            <input
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileChange(f); }}
            />
          </label>
          {file && (
            <>
              <span className="text-[11px] text-text-tertiary">{(file.size / 1024).toFixed(1)} KB</span>
              <button onClick={() => onFileChange(null)} className="text-xs text-accent-red hover:underline cursor-pointer">
                Remove
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
