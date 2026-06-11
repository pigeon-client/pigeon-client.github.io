import { useEffect, useState } from 'react';
import { useTheme } from '@heroui/react';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { UrlBar } from './components/UrlBar';
import { RequestEditor } from './components/RequestEditor';
import { ResponsePanel } from './components/ResponsePanel';
import { EnvModal } from './components/EnvModal';
import { ImportModal } from './components/ImportModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { StatusBar } from './components/StatusBar';
import { ResizablePanel } from './components/ResizablePanel';
import { useTabStore } from './store/tabStore';
import { useHistoryStore } from './store/historyStore';
import { useCollectionStore } from './store/collectionStore';
import { checkForUpdates } from './lib/updater';

function AppContent() {
  useTheme('dark');
  useEffect(() => {
    document.documentElement.classList.add('dark');
    useHistoryStore.getState().load();
    useCollectionStore.getState().load();
    checkForUpdates(true);
  }, []);

  const [showEnvModal, setShowEnvModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [layoutOrientation, setLayoutOrientation] = useState<'vertical' | 'horizontal'>(() => {
    return (localStorage.getItem('pigeon-layout-orientation') as 'vertical' | 'horizontal') || 'vertical';
  });

  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const addTab = useTabStore((s) => s.addTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;

      // Cmd+Enter: Send request
      if (meta && e.key === 'Enter') {
        e.preventDefault();
        const sendBtn = document.querySelector('[data-send-btn]') as HTMLButtonElement;
        sendBtn?.click();
        return;
      }

      // ? key: Show shortcuts modal
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        if (!meta) {
          e.preventDefault();
          setShowShortcutsModal(true);
          return;
        }
      }

      // Escape: Close modals / blur
      if (e.key === 'Escape') {
        if (showShortcutsModal) { setShowShortcutsModal(false); return; }
        if (showEnvModal) { setShowEnvModal(false); return; }
        if (showImportModal) { setShowImportModal(false); return; }
        if (document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }
        return;
      }

      // Cmd+N: New tab
      if (meta && e.key === 'n') {
        e.preventDefault();
        addTab();
        return;
      }

      // Cmd+W: Close current tab
      if (meta && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
        return;
      }

      // Cmd+F: Focus sidebar search
      if (meta && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('[data-sidebar-search]') as HTMLInputElement;
        searchInput?.focus();
        return;
      }

      // Cmd+S: Save to collection
      if (meta && e.key === 's') {
        e.preventDefault();
        // Trigger a custom event that the sidebar can listen to
        window.dispatchEvent(new CustomEvent('pigeon:save-to-collection'));
        return;
      }

      // Cmd+Shift+[1-9]: Switch tab
      if (meta && e.shiftKey && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const index = parseInt(e.key, 10) - 1;
        const tab = tabs[index];
        if (tab) setActiveTab(tab.id);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTabId, tabs, addTab, closeTab, setActiveTab, showShortcutsModal, showEnvModal, showImportModal]);

  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      {/* Row 1: Toolbar (brand + tabs + env selector) */}
      <Toolbar
        onOpenEnv={() => setShowEnvModal(true)}
        onOpenSettings={() => {/* Future settings */}}
      />

      {/* Row 2: URL Bar */}
      <UrlBar onImportClick={() => setShowImportModal(true)} />

      {/* Main content: Sidebar + Request/Response panels */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Sidebar */}
        <Sidebar />

        {/* Request/Response panels */}
        <div className="flex-1 flex flex-col min-w-0">
          <ResizablePanel
            orientation={layoutOrientation}
            onOrientationChange={setLayoutOrientation}
            defaultSize={300}
            minSize={100}
            maxSize={800}
          >
            {/* Request area */}
            <div className="h-full flex flex-col bg-bg-primary">
              {tabs.map((tab) => (
                <div key={tab.id} className="h-full flex flex-col" style={{ display: tab.id === activeTabId ? 'flex' : 'none' }}>
                  <RequestEditor tabId={tab.id} />
                </div>
              ))}
            </div>

            {/* Response panel */}
            <div className="h-full flex flex-col bg-bg-primary">
              {tabs.map((tab) => (
                <div key={tab.id} className="h-full flex flex-col" style={{ display: tab.id === activeTabId ? 'flex' : 'none' }}>
                  <ResponsePanel tabId={tab.id} />
                </div>
              ))}
            </div>
          </ResizablePanel>
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Modals */}
      {showEnvModal && <EnvModal onClose={() => setShowEnvModal(false)} />}
      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} />}
      {showShortcutsModal && <KeyboardShortcutsModal onClose={() => setShowShortcutsModal(false)} />}
    </div>
  );
}

function App() {
  return <AppContent />;
}

export default App;
