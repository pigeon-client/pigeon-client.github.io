import { useTabStore } from '../store/tabStore';
import { useHistoryStore } from '../store/historyStore';
import { useEnvStore } from '../store/envStore';
import { parseUrl, extractEndpoint } from '../lib/url';
import { replaceEnvVariables } from '../lib/env';
import { useApiRequest } from '../hooks/useApiRequest';
import { HttpMethod } from '../types';
import { ChevronDown } from 'lucide-react';

const METHOD_COLORS: Record<string, string> = {
  GET: '#49cc90',
  POST: '#61affe',
  PUT: '#fca130',
  PATCH: '#50e3c2',
  DELETE: '#f93e3e',
};

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export function UrlBar() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const updateTabRequest = useTabStore((s) => s.updateTabRequest);
  const setTabLoading = useTabStore((s) => s.setTabLoading);
  const updateTabResponse = useTabStore((s) => s.updateTabResponse);
  const setTabName = useTabStore((s) => s.setTabName);
  const addToHistory = useHistoryStore((s) => s.addToHistory);
  const saveDraft = useHistoryStore((s) => s.saveDraft);
  const activeEnv = useEnvStore((s) => s.activeEnv);
  const { sendRequest } = useApiRequest();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  if (!activeTab) return null;

  const { request } = activeTab;

  const handleSend = async () => {
    if (!request.url) return;
    setTabLoading(activeTab.id, true);
    try {
      const result = await sendRequest(request);
      updateTabResponse(activeTab.id, result);
      addToHistory({
        name: request.name,
        method: request.method,
        url: request.url,
        statusCode: result.status,
        responseTime: result.responseTime,
        timestamp: Date.now(),
        request: { ...request },
      });
      saveDraft({ ...request });
    } catch {
      updateTabResponse(activeTab.id, {
        status: 0,
        statusText: 'Request Failed',
        headers: {},
        body: [],
        contentType: 'text/plain',
        responseTime: 0,
        size: 0,
      });
    } finally {
      setTabLoading(activeTab.id, false);
    }
  };

  const previewUrl = (() => {
    const parsed = parseUrl(request.url);
    return activeEnv ? replaceEnvVariables(parsed, activeEnv) : parsed;
  })();

  const methodColor = METHOD_COLORS[request.method] ?? '#e8e8e8';

  return (
    <div className="px-3 py-2.5 border-b border-border-primary bg-bg-secondary shrink-0">
      <div className="flex items-stretch h-9 rounded border border-border-primary overflow-hidden bg-bg-primary">

        {/* Method dropdown */}
        <div className="relative flex items-center shrink-0 border-r border-border-primary">
          <select
            value={request.method}
            onChange={(e) => updateTabRequest(activeTab.id, { method: e.target.value as HttpMethod })}
            style={{ color: methodColor }}
            className="appearance-none h-full pl-3 pr-7 text-xs font-bold bg-transparent
              cursor-pointer focus:outline-none"
          >
            {METHODS.map((m) => (
              <option key={m} value={m} style={{ color: METHOD_COLORS[m] }}>{m}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-2 pointer-events-none text-text-tertiary" />
        </div>

        {/* URL input */}
        <input
          type="text"
          value={request.url}
          onChange={(e) => {
            const url = e.target.value;
            updateTabRequest(activeTab.id, { url });
            if (!activeTab.nameLocked && url) {
              setTabName(activeTab.id, extractEndpoint(url));
            }
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Enter URL or paste text"
          className="flex-1 px-3 text-sm bg-transparent text-text-primary
            placeholder:text-text-tertiary focus:outline-none"
        />

        {/* Send button */}
        <button
          data-send-btn
          onClick={handleSend}
          disabled={!request.url || activeTab.isLoading}
          className="px-6 text-sm font-medium text-white bg-accent-orange shrink-0
            hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
        >
          {activeTab.isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Send'
          )}
        </button>
      </div>

      {/* Resolved URL preview */}
      {request.url && previewUrl !== request.url && (
        <div className="mt-1 ml-1 text-[11px] text-text-tertiary truncate">{previewUrl}</div>
      )}
    </div>
  );
}
