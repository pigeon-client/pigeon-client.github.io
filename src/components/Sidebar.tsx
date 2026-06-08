import { useState, useMemo } from 'react';
import { useTabStore } from '../store/tabStore';
import { useHistoryStore } from '../store/historyStore';
import { extractDomain, extractMainDomain } from '../lib/url';
import { HistoryItem, RequestConfig } from '../types';
import { Search, Trash2, Clock, FileText, Plus, Upload } from 'lucide-react';
import { ImportModal } from './ImportModal';

const METHOD_COLORS: Record<string, string> = {
  GET: '#49cc90',
  POST: '#61affe',
  PUT: '#fca130',
  PATCH: '#50e3c2',
  DELETE: '#f93e3e',
};

export function Sidebar() {
  const addTab = useTabStore((s) => s.addTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const history = useHistoryStore((s) => s.history);
  const drafts = useHistoryStore((s) => s.drafts);
  const removeDraft = useHistoryStore((s) => s.removeDraft);
  const removeHistory = useHistoryStore((s) => s.removeHistory);
  const updateTabRequest = useTabStore((s) => s.updateTabRequest);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'drafts' | 'history'>('drafts');
  const [showImport, setShowImport] = useState(false);

  const createNewRequest = () => {
    const id = addTab();
    setActiveTab(id);
  };

  const loadRequest = (req: RequestConfig) => {
    const tabs = useTabStore.getState().tabs;
    if (tabs.length === 1 && !tabs[0].request.url) {
      updateTabRequest(tabs[0].id, req);
      setActiveTab(tabs[0].id);
    } else {
      const id = addTab();
      updateTabRequest(id, req);
      setActiveTab(id);
    }
  };

  const filterBySearch = (text: string) =>
    !search || text.toLowerCase().includes(search.toLowerCase());

  const groupedDrafts = useMemo(() => {
    const groups: Record<string, { subdomain: string; items: RequestConfig[] }[]> = {};
    for (const item of drafts) {
      if (!filterBySearch(item.name || item.url || '')) continue;
      const domain = item.url ? extractDomain(item.url) : 'unsorted';
      const main = domain === 'unsorted' ? 'Unsorted' : extractMainDomain(domain);
      if (!groups[main]) groups[main] = [];
      let sub = groups[main].find((g) => g.subdomain === domain);
      if (!sub) { sub = { subdomain: domain, items: [] }; groups[main].push(sub); }
      sub.items.push(item);
    }
    for (const k of Object.keys(groups)) groups[k].sort((a, b) => a.subdomain.localeCompare(b.subdomain));
    return groups;
  }, [drafts, search]);

  const groupedHistory = useMemo(() => {
    const groups: Record<string, { subdomain: string; items: HistoryItem[] }[]> = {};
    for (const item of history) {
      if (!filterBySearch(item.url)) continue;
      const domain = extractDomain(item.url);
      const main = extractMainDomain(domain);
      if (!groups[main]) groups[main] = [];
      let sub = groups[main].find((g) => g.subdomain === domain);
      if (!sub) { sub = { subdomain: domain, items: [] }; groups[main].push(sub); }
      sub.items.push(item);
    }
    for (const k of Object.keys(groups)) groups[k].sort((a, b) => a.subdomain.localeCompare(b.subdomain));
    return groups;
  }, [history, search]);

  return (
    <div className="h-full flex flex-col bg-bg-tertiary border-r border-border-primary">

      {/* Top action buttons */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-border-primary shrink-0">
        <button
          onClick={createNewRequest}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium
            text-white bg-accent-orange rounded hover:brightness-110 transition-all cursor-pointer"
        >
          <Plus size={13} />
          New
        </button>
        <button
          onClick={() => setShowImport(true)}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium
            text-text-secondary border border-border-primary rounded
            hover:bg-bg-hover hover:text-text-primary transition-colors cursor-pointer"
        >
          <Upload size={13} />
          Import
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter..."
            className="w-full pl-7 pr-3 py-1.5 text-xs bg-bg-secondary text-text-primary
              border border-border-primary rounded placeholder:text-text-tertiary
              focus:outline-none focus:border-accent-orange/50 transition-colors"
          />
        </div>
      </div>

      {/* Flat Drafts / History tabs */}
      <div className="flex items-center border-b border-border-primary shrink-0 px-3">
        {(['drafts', 'history'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`relative py-2 mr-4 text-xs font-medium capitalize transition-colors
              ${view === v ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            {v === 'drafts' ? 'Drafts' : 'History'}
            {view === v && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-orange" />
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">

        {/* ── Drafts ── */}
        {view === 'drafts' && (
          Object.keys(groupedDrafts).length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2">
              <FileText size={18} className="text-text-tertiary" />
              <p className="text-[11px] text-text-tertiary">No saved drafts</p>
            </div>
          ) : (
            Object.entries(groupedDrafts)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([domain, subdomains]) => (
                <div key={domain} className="mb-1">
                  <div className="px-3 py-1 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                    {domain}
                  </div>
                  {subdomains.map((sub) =>
                    sub.items.map((draft, i) => (
                      <div
                        key={i}
                        onClick={() => loadRequest(draft)}
                        className="group flex items-center gap-2 px-3 py-1.5 cursor-pointer
                          hover:bg-bg-hover transition-colors"
                      >
                        <span
                          className="text-[10px] font-bold w-10 shrink-0"
                          style={{ color: METHOD_COLORS[draft.method] ?? '#ababab' }}
                        >
                          {draft.method}
                        </span>
                        <span className="text-[11px] text-text-secondary truncate flex-1">
                          {draft.name || draft.url?.split('/').pop() || 'Untitled'}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeDraft(drafts.indexOf(draft)); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded
                            text-text-tertiary hover:text-accent-red transition-all shrink-0"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ))
          )
        )}

        {/* ── History ── */}
        {view === 'history' && (
          Object.keys(groupedHistory).length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2">
              <Clock size={18} className="text-text-tertiary" />
              <p className="text-[11px] text-text-tertiary">No history yet</p>
            </div>
          ) : (
            Object.entries(groupedHistory)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([domain, subdomains]) => (
                <div key={domain} className="mb-1">
                  <div className="px-3 py-1 text-[10px] font-semibold text-text-tertiary uppercase tracking-wider">
                    {domain}
                  </div>
                  {subdomains.map((sub) =>
                    sub.items.map((item, i) => (
                      <div
                        key={i}
                        onClick={() => loadRequest(item.request)}
                        className="group flex items-center gap-2 px-3 py-1.5 cursor-pointer
                          hover:bg-bg-hover transition-colors"
                      >
                        {/* Status badge */}
                        <span className={`text-[9px] font-bold w-7 shrink-0 text-center px-1 py-0.5 rounded ${
                          item.statusCode >= 200 && item.statusCode < 300
                            ? 'text-accent-green bg-accent-green/10'
                            : item.statusCode >= 400
                            ? 'text-accent-red bg-accent-red/10'
                            : item.statusCode >= 300
                            ? 'text-accent-orange bg-accent-orange/10'
                            : 'text-text-tertiary bg-bg-hover'
                        }`}>
                          {item.statusCode || '—'}
                        </span>
                        <span
                          className="text-[10px] font-bold w-9 shrink-0"
                          style={{ color: METHOD_COLORS[item.method] ?? '#ababab' }}
                        >
                          {item.method}
                        </span>
                        <span className="text-[11px] text-text-secondary truncate flex-1">
                          {item.name || item.url?.split('/').pop()}
                        </span>
                        <span className="text-[10px] text-text-tertiary shrink-0">
                          {Math.round((Date.now() - item.timestamp) / 60000)}m
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeHistory(history.indexOf(item)); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded
                            text-text-tertiary hover:text-accent-red transition-all shrink-0"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ))
          )
        )}
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </div>
  );
}
