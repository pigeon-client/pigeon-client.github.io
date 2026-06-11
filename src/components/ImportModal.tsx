import { useState } from 'react';
import { useTabStore } from '../store/tabStore';
import { parseCurl } from '../lib/curlParser';
import { X } from 'lucide-react';

interface ImportModalProps {
  onClose: () => void;
}

export function ImportModal({ onClose }: ImportModalProps) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');
  const addTab = useTabStore((s) => s.addTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const updateTabRequest = useTabStore((s) => s.updateTabRequest);

  const handleImport = () => {
    if (!raw.trim()) {
      setError('Please paste a cURL command');
      return;
    }
    const parsed = parseCurl(raw);
    if (!parsed) {
      setError('Could not parse cURL command. Make sure it starts with "curl" and contains a URL.');
      return;
    }
    const id = addTab();
    updateTabRequest(id, parsed);
    setActiveTab(id);
    onClose();
  };

  return (
    <div className="backdrop">
      <div className="modal-card w-[600px]">
        {/* Header */}
        <div className="modal-header">
          <h2 className="text-sm font-semibold text-text-primary">Import from cURL</h2>
          <button onClick={onClose} className="btn-icon"><X size={18} /></button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <label className="section-label">Paste your cURL command below</label>
          <textarea
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setError(''); }}
            placeholder={'curl https://api.example.com/users -H \'Authorization: Bearer token\' -d \'{"name":"John"}\''}
            className="w-full h-36 p-3 text-xs font-mono bg-bg-code text-text-primary border border-border-primary rounded-lg resize-none
              placeholder:text-text-tertiary focus-ring"
            spellCheck={false}
          />
          {error && (
            <p className="text-xs text-accent-red">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleImport} className="btn-primary">Import</button>
        </div>
      </div>
    </div>
  );
}
