import { useTabStore } from '../store/tabStore';
import { useHistoryStore } from '../store/historyStore';
import { useCollectionStore } from '../store/collectionStore';

export function StatusBar() {
  const tabs = useTabStore((s) => s.tabs);
  const history = useHistoryStore((s) => s.history);
  const collections = useCollectionStore((s) => s.collections);
  const drafts = useHistoryStore((s) => s.drafts);

  if (tabs.length === 0) return null;

  return (
    <div className="h-6 flex items-center justify-between px-3 bg-bg-tertiary border-t border-border-primary shrink-0 select-none">
      <div className="flex items-center gap-3 text-[10px] text-text-tertiary">
        <span>{history.length} request{history.length !== 1 ? 's' : ''}</span>
        <span>{collections.length} collection{collections.length !== 1 ? 's' : ''}</span>
        <span>{drafts.length} draft{drafts.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="text-[10px] text-text-tertiary">
        <kbd className="px-1 py-0.5 rounded bg-bg-hover text-text-tertiary font-mono">?</kbd>
        <span className="ml-1">help</span>
      </div>
    </div>
  );
}
