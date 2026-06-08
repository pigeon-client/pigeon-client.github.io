import { useEffect, useRef, useState, useCallback } from 'react';
import { useTheme } from '@heroui/react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { TabBar } from './components/TabBar';
import { UrlBar } from './components/UrlBar';
import { RequestEditor } from './components/RequestEditor';
import { ResponsePanel } from './components/ResponsePanel';
import { EnvModal } from './components/EnvModal';
import { useTabStore } from './store/tabStore';
import { useHistoryStore } from './store/historyStore';

function AppContent() {
  useTheme('dark');
  useEffect(() => {
    document.documentElement.classList.add('dark');
    useHistoryStore.getState().load();
  }, []);
  const [showEnvModal, setShowEnvModal] = useState(false);
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);

  const [responseHeight, setResponseHeight] = useState(300);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newHeight = Math.max(100, Math.min(rect.height - 100, rect.bottom - e.clientY));
      setResponseHeight(newHeight);
    };
    const handleMouseUp = () => {
      if (dragging.current) {
        dragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        const sendBtn = document.querySelector('[data-send-btn]') as HTMLButtonElement;
        sendBtn?.click();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-bg-primary">
      <Header onOpenEnv={() => setShowEnvModal(true)} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 shrink-0 overflow-hidden">
          <Sidebar />
        </div>
        <div ref={containerRef} className="flex-1 flex flex-col bg-bg-secondary min-w-0">
          <TabBar />
          <UrlBar />
          <div className="flex-1 overflow-y-auto min-h-0">
            {tabs.map((tab) => (
              <div key={tab.id} className={tab.id === activeTabId ? '' : 'hidden'}>
                <RequestEditor tabId={tab.id} />
              </div>
            ))}
          </div>
          {/* Drag Handle */}
          <div
            onMouseDown={handleMouseDown}
            className="group relative h-1.5 cursor-ns-resize shrink-0 z-10"
          >
            <div className="absolute inset-y-0 left-0 right-0 -top-1 -bottom-1" />
            <div className="w-full h-px bg-border-primary group-hover:bg-accent-orange/60 transition-colors" />
          </div>
          <div
            className="overflow-y-auto shrink-0 bg-bg-primary"
            style={{ height: responseHeight }}
          >
            {tabs.map((tab) => (
              <div key={tab.id} className={tab.id === activeTabId ? '' : 'hidden'}>
                <ResponsePanel tabId={tab.id} />
              </div>
            ))}
          </div>
        </div>
      </div>
      {showEnvModal && <EnvModal onClose={() => setShowEnvModal(false)} />}
    </div>
  );
}

function App() {
  return <AppContent />;
}

export default App;
