import { useState } from 'react';
import { useTabStore } from '../store/tabStore';
import { BodyEditor } from './BodyEditor';
import { HeadersEditor } from './HeadersEditor';
import { AuthEditor } from './AuthEditor';
import { KeyValueEditor } from './KeyValueEditor';

type RequestTab = 'params' | 'auth' | 'headers' | 'body' | 'settings';

interface RequestEditorProps {
  tabId: string;
}

export function RequestEditor({ tabId }: RequestEditorProps) {
  const tabs = useTabStore((s) => s.tabs);
  const updateTabRequest = useTabStore((s) => s.updateTabRequest);
  const tab = tabs.find((t) => t.id === tabId);
  const [activeTab, setActiveTab] = useState<RequestTab>('params');

  if (!tab) return null;
  const { request } = tab;

  const headerCount = request.headers.filter((h) => h.key.trim()).length;
  const hasBody = request.bodyType !== 'none' && (request.body.trim() || request.formData?.some((f) => f.key));

  const tabDefs: { id: RequestTab; label: string; badge?: number; dot?: string }[] = [
    { id: 'params', label: 'Params' },
    { id: 'auth', label: 'Authorization' },
    { id: 'headers', label: 'Headers', badge: headerCount || undefined },
    { id: 'body', label: 'Body', dot: hasBody ? '#49cc90' : undefined },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Flat tab bar */}
      <div className="flex items-center border-b border-border-primary bg-bg-secondary shrink-0 px-1">
        <div className="flex items-center flex-1">
          {tabDefs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`relative flex items-center gap-1.5 px-3.5 py-2.5 text-xs whitespace-nowrap
                transition-colors shrink-0 cursor-pointer
                ${activeTab === t.id ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              {t.label}
              {t.badge != null && (
                <span className="text-[10px] text-text-secondary">({t.badge})</span>
              )}
              {t.dot && (
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: t.dot }} />
              )}
              {activeTab === t.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-orange" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {activeTab === 'params' && (
          <div>
            <p className="text-xs font-medium text-text-secondary mb-2">Query Params</p>
            <KeyValueEditor
              items={request.params}
              onChange={(params) => updateTabRequest(tabId, { params })}
              keyPlaceholder="Key"
              valuePlaceholder="Value"
            />
          </div>
        )}

        {activeTab === 'headers' && (
          <HeadersEditor
            headers={request.headers}
            onHeadersChange={(headers) => updateTabRequest(tabId, { headers })}
          />
        )}

        {activeTab === 'auth' && (
          <AuthEditor
            auth={request.auth}
            onAuthChange={(auth) => updateTabRequest(tabId, { auth })}
          />
        )}

        {activeTab === 'body' && (
          <BodyEditor
            bodyType={request.bodyType}
            body={request.body}
            formData={request.formData}
            multipart={request.multipart}
            file={request.file}
            onBodyChange={(body) => updateTabRequest(tabId, { body })}
            onFormDataChange={(formData) => updateTabRequest(tabId, { formData })}
            onBodyTypeChange={(bodyType) => updateTabRequest(tabId, { bodyType })}
            onMultipartChange={(multipart) => updateTabRequest(tabId, { multipart })}
            onFileChange={(file) => updateTabRequest(tabId, { file })}
          />
        )}

        {activeTab === 'settings' && (
          <div className="space-y-0">
            {[
              { label: 'Follow redirects', desc: 'Automatically follow HTTP redirects' },
              { label: 'SSL certificate verification', desc: 'Verify SSL certificates for HTTPS requests' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-3 border-b border-border-primary">
                <div>
                  <p className="text-xs font-medium text-text-primary">{item.label}</p>
                  <p className="text-[11px] text-text-tertiary mt-0.5">{item.desc}</p>
                </div>
                <input type="checkbox" defaultChecked className="accent-accent-orange" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
