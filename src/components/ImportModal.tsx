import { useState } from 'react';
import { Button } from '@heroui/react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[600px] bg-bg-secondary rounded-2xl shadow-2xl border border-border-primary overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary">
          <h2 className="text-sm font-semibold text-text-primary">Import from cURL</h2>
          <Button isIconOnly variant="ghost" onPress={onClose}>
            <X size={18} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <label className="text-xs font-medium text-text-secondary">
            Paste your cURL command below
          </label>
          <textarea
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setError(''); }}
            placeholder={'curl https://api.example.com/users -H \'Authorization: Bearer token\' -d \'{"name":"John"}\''}
            className="w-full h-36 p-3 text-xs font-mono bg-bg-code text-text-primary border border-border-primary rounded-xl resize-none
              placeholder:text-text-tertiary
              focus:outline-none focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue transition-all"
            spellCheck={false}
          />
          {error && (
            <p className="text-xs text-accent-red">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border-primary bg-bg-hover/50">
          <Button variant="secondary" onPress={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onPress={handleImport}>
            Import
          </Button>
        </div>
      </div>
    </div>
  );
}
