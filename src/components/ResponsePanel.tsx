import { useEffect, useRef, useState, useMemo } from 'react';
import hljs from 'highlight.js';
import { SegmentedControl } from './ui/SegmentedControl';
import { Badge } from './ui/Badge';
import { Clock, Download, Clipboard, XCircle, ChevronDown, ChevronUp, Terminal, Image, FileCode } from 'lucide-react';
import { generateCurl } from '../lib/curl';
import { useTabStore } from '../store/tabStore';

function formatBody(body: number[]): string {
  return new TextDecoder().decode(new Uint8Array(body));
}

function getStatusVariant(status: number): 'success' | 'warning' | 'error' | 'info' {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'warning';
  if (status >= 400) return 'error';
  return 'info';
}

function RocketIllustration() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className="text-text-tertiary">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

/** Detect response type */
type ResponseType = 'json' | 'html' | 'xml' | 'image' | 'audio' | 'video' | 'octet' | 'text' | 'form' | 'other';

function detectType(contentType: string): ResponseType {
  const ct = contentType.toLowerCase();
  if (ct.includes('json')) return 'json';
  if (ct.includes('html')) return 'html';
  if (ct.includes('xml')) return 'xml';
  if (ct.startsWith('image/')) return 'image';
  if (ct.startsWith('audio/')) return 'audio';
  if (ct.startsWith('video/')) return 'video';
  if (ct.includes('octet-stream')) return 'octet';
  if (ct.includes('text/')) return 'text';
  if (ct.includes('form')) return 'form';
  return 'other';
}

/** Check if body is likely binary (non-text) */
function isBinaryBody(body: number[]): boolean {
  const sample = body.slice(0, 4096);
  for (const byte of sample) {
    if (byte === 0 || (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13)) return true;
  }
  return false;
}

export function ResponsePanel({ tabId }: { tabId: string }) {
  const tabs = useTabStore((s) => s.tabs);
  const updateTabResponse = useTabStore((s) => s.updateTabResponse);
  const tab = tabs.find((t) => t.id === tabId);
  const response = tab?.response ?? null;
  const isLoading = tab?.isLoading ?? false;
  const request = tab?.request;

  const [activeTab, setActiveTab] = useState<'body' | 'headers' | 'preview' | 'console'>('body');
  const [collapsed, setCollapsed] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  const bodyBytes = response?.body ?? [];
  const bodyStr = useMemo(() => formatBody(bodyBytes), [bodyBytes]);
  const respType = response ? detectType(response.contentType) : 'text';
  const isBinary = bodyBytes.length > 0 && isBinaryBody(bodyBytes);
  const isImage = respType === 'image';
  const isHtml = respType === 'html';

  // Tab options
  const tabOptions = [
    { value: 'body', label: 'Body' },
    { value: 'headers', label: 'Headers' },
    ...(isHtml ? [{ value: 'preview', label: 'Preview' }] : []),
    ...(isImage ? [{ value: 'preview', label: 'Preview' }] : []),
    { value: 'console', label: 'Console' },
  ];

  // Syntax highlight
  useEffect(() => {
    if (codeRef.current && response && bodyBytes.length > 0 && !isImage && !isBinary) {
      let code = bodyStr;
      if (respType === 'json') {
        try { code = JSON.stringify(JSON.parse(code), null, 2); } catch {}
      }
      codeRef.current.textContent = code;
      codeRef.current.className = '';
      if (respType === 'json') codeRef.current.classList.add('language-json');
      else if (respType === 'html') codeRef.current.classList.add('language-html');
      else if (respType === 'xml') codeRef.current.classList.add('language-xml');
      hljs.highlightElement(codeRef.current);
    }
  }, [response, bodyStr, bodyBytes.length, isImage, isBinary, respType]);

  const resolvedUrl = response?.resolvedUrl ?? '';
  const sentHeaders: Record<string, string> = response?.sentHeaders ?? {};
  const responseSize = bodyBytes.length;

  /* ── Collapsed state ── */
  if (collapsed) {
    return (
      <div className="h-full flex flex-col">
        <div className="panel-header">
          <div className="flex items-center gap-3">
            {response && (
              <>
                <Badge variant={getStatusVariant(response.status)} className="text-[11px]">
                  {response.status} {response.statusText}
                </Badge>
                <span className="text-[11px] text-text-secondary flex items-center gap-1">
                  <Clock size={11} /> {response.responseTime}ms
                </span>
                <span className="text-[11px] text-text-secondary">
                  {(responseSize / 1024).toFixed(1)} KB
                </span>
              </>
            )}
          </div>
          <button
            onClick={() => setCollapsed(false)}
            className="btn-icon"
            title="Expand response"
          >
            <ChevronUp size={14} />
          </button>
        </div>
      </div>
    );
  }

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="panel-header">
          <span className="text-xs font-medium text-text-secondary">Response</span>
          <button
            onClick={() => setCollapsed(true)}
            className="btn-icon"
            title="Collapse response"
          >
            <ChevronDown size={14} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-accent-orange/30 border-t-accent-orange rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  /* ── Empty state ── */
  if (!response || (response.status === 0 && bodyBytes.length === 0 && !resolvedUrl)) {
    return (
      <div className="h-full flex flex-col">
        <div className="panel-header">
          <span className="text-xs font-medium text-text-secondary">Response</span>
          <button
            onClick={() => setCollapsed(true)}
            className="btn-icon"
            title="Collapse response"
          >
            <ChevronDown size={14} />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
          <RocketIllustration />
          <div className="text-center">
            <p className="text-sm font-medium text-text-secondary mb-1">Ready to send a request</p>
            <p className="text-xs text-text-tertiary max-w-xs">
              Enter a URL above and click Send to get started
            </p>
          </div>
          <button
            onClick={() => {
              const tabStore = useTabStore.getState();
              const tid = tabStore.activeTabId;
              if (tid) tabStore.updateTabRequest(tid, {
                method: 'GET',
                url: 'https://jsonplaceholder.typicode.com/posts/1'
              });
            }}
            className="btn-ghost"
          >
            <Terminal size={12} />
            Try: <code className="font-mono">curl https://jsonplaceholder.typicode.com/posts/1</code>
          </button>
        </div>
      </div>
    );
  }

  /* ── Render body content based on type ── */
  const renderBody = () => {
    if (isImage && bodyBytes.length > 0) {
      const blob = new Blob([new Uint8Array(bodyBytes)], { type: response.contentType });
      const dataUrl = URL.createObjectURL(blob);
      return (
        <div className="flex items-center justify-center p-4">
          <img src={dataUrl} alt="Response image" className="max-w-full max-h-full rounded"
            onLoad={() => URL.revokeObjectURL(dataUrl)} />
        </div>
      );
    }

    if (isBinary || respType === 'octet') {
      const size = bodyBytes.length;
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-text-tertiary">
          <FileCode size={32} />
          <p className="text-sm">Binary Response ({response.contentType})</p>
          <p className="text-xs">{(size / 1024).toFixed(1)} KB — {(size / 1048576).toFixed(2)} MB</p>
          <button
            onClick={() => {
              const blob = new Blob([new Uint8Array(bodyBytes)], { type: response.contentType ?? '' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `response-${Date.now()}`; a.click();
              URL.revokeObjectURL(url);
            }}
            className="btn-ghost"
          >
            <Download size={12} /> Download File
          </button>
        </div>
      );
    }

    if (bodyBytes.length > 0) {
      return (
        <pre className="text-xs font-mono bg-bg-code text-accent-orange rounded-lg p-4 overflow-auto max-h-full border border-accent-orange/10">
          <code ref={codeRef} className="text-accent-orange" />
        </pre>
      );
    }

    return (
      <div className="flex items-center justify-center py-12 text-text-tertiary text-sm">
        Empty response body
      </div>
    );
  };

  /* ── Response content ── */
  return (
    <div className="h-full flex flex-col">
      {/* Response header */}
      <div className="panel-header">
        <div className="flex items-center gap-3">
          <Badge variant={getStatusVariant(response.status)} className="text-[11px]">
            {response.status} {response.statusText}
          </Badge>
          <span className="text-[11px] text-text-secondary flex items-center gap-1">
            <Clock size={11} /> {response.responseTime}ms
          </span>
          <span className="text-[11px] text-text-secondary">
            {(responseSize / 1024).toFixed(1)} KB
          </span>
          <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider">
            {respType}
          </span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="btn-icon"
          title="Collapse response"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Tabs + Action buttons */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border-primary bg-bg-secondary shrink-0">
        <SegmentedControl
          options={tabOptions}
          value={activeTab}
          onChange={(v) => setActiveTab(v as 'body' | 'headers' | 'preview' | 'console')}
        />
        <div className="flex-1" />
        {isImage && activeTab === 'body' && (
          <button
            onClick={() => {
              const blob = new Blob([new Uint8Array(bodyBytes)], { type: response.contentType ?? '' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `image-${Date.now()}`; a.click();
              URL.revokeObjectURL(url);
            }}
            className="btn-icon"
            title="Download image"
          >
            <Image size={14} />
          </button>
        )}
        <button
          onClick={() => updateTabResponse(tabId, null)}
          className="btn-icon"
          title="Clear response"
        >
          <XCircle size={14} />
        </button>
        {request && (
          <button
            onClick={() => navigator.clipboard.writeText(generateCurl(request))}
            className="btn-icon"
            title="Copy as cURL"
          >
            <Terminal size={14} />
          </button>
        )}
        <button
          onClick={() => navigator.clipboard.writeText(bodyStr)}
          className="btn-icon"
          title="Copy response body"
        >
          <Clipboard size={14} />
        </button>
        <button
          onClick={() => {
            const blob = new Blob([new Uint8Array(bodyBytes)], { type: response.contentType ?? '' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `response-${Date.now()}`; a.click();
            URL.revokeObjectURL(url);
          }}
          className="btn-icon"
          title="Download response"
        >
          <Download size={14} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 py-3">
        {activeTab === 'headers' ? (
          <div className="space-y-0.5">
            {Object.entries(response.headers).map(([key, value]) => (
              <div key={key} className="flex items-start gap-3 py-1.5 px-2 rounded hover:bg-bg-hover transition-colors">
                <span className="text-xs font-medium text-text-primary min-w-[180px] shrink-0">{key}</span>
                <span className="text-xs text-text-secondary break-all">{value}</span>
              </div>
            ))}
          </div>
        ) : activeTab === 'preview' && isHtml ? (
          <iframe
            srcDoc={bodyStr}
            className="w-full h-full border border-border-primary rounded bg-white"
            sandbox="allow-scripts"
          />
        ) : activeTab === 'preview' && isImage ? (
          <div className="flex items-center justify-center p-4 h-full">
            {(() => {
              const blob = new Blob([new Uint8Array(bodyBytes)], { type: response.contentType });
              const dataUrl = URL.createObjectURL(blob);
              return <img src={dataUrl} alt="Response" className="max-w-full max-h-full object-contain rounded"
                onLoad={() => setTimeout(() => URL.revokeObjectURL(dataUrl), 1000)} />;
            })()}
          </div>
        ) : activeTab === 'console' ? (
          <div className="space-y-4 text-xs">
            <div>
              <h4 className="font-medium text-text-secondary mb-2">Resolved URL</h4>
              <code className="text-text-primary bg-bg-code px-2 py-1 rounded block break-all">{resolvedUrl || 'N/A'}</code>
            </div>
            <div>
              <h4 className="font-medium text-text-secondary mb-2">Request Headers Sent</h4>
              {Object.keys(sentHeaders).length === 0 ? (
                <p className="text-text-tertiary">No headers captured</p>
              ) : (
                <div className="space-y-1">
                  {Object.entries(sentHeaders).map(([k, v]) => (
                    <div key={k} className="flex gap-3 py-0.5">
                      <span className="font-medium text-text-primary min-w-[160px]">{k}</span>
                      <span className="text-text-secondary">{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h4 className="font-medium text-text-secondary mb-2">Timing</h4>
              <div className="flex items-center gap-4">
                <span className="text-text-tertiary">Response time:</span>
                <span className="font-mono text-text-primary">{response.responseTime}ms</span>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-text-secondary mb-2">Response Info</h4>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-text-tertiary">Content-Type:</span>
                <span className="text-text-primary">{response.contentType}</span>
                <span className="text-text-tertiary">Size:</span>
                <span className="text-text-primary">{(responseSize / 1024).toFixed(1)} KB ({(responseSize / 1048576).toFixed(2)} MB)</span>
                <span className="text-text-tertiary">Type:</span>
                <span className="text-text-primary uppercase">{respType}</span>
              </div>
            </div>
          </div>
        ) : (
          renderBody()
        )}
      </div>
    </div>
  );
}
