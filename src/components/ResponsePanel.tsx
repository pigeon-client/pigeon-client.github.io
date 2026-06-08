import { useEffect, useRef, useState } from 'react';
import { Button } from '@heroui/react';
import hljs from 'highlight.js';
import { SegmentedControl } from './ui/SegmentedControl';
import { Badge } from './ui/Badge';
import { Clock, Download, Clipboard, XCircle, ChevronDown } from 'lucide-react';
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

function AstronautIllustration() {
  return (
    <svg viewBox="0 0 280 230" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-52 h-44 opacity-80">
      {/* Stars */}
      <circle cx="32" cy="45" r="2" fill="#5d5d5d" />
      <circle cx="62" cy="22" r="1.5" fill="#5d5d5d" />
      <circle cx="18" cy="155" r="1.5" fill="#5d5d5d" />
      <circle cx="255" cy="35" r="2" fill="#5d5d5d" />
      <circle cx="265" cy="62" r="1.5" fill="#5d5d5d" />
      <circle cx="258" cy="158" r="2" fill="#5d5d5d" />
      <circle cx="42" cy="185" r="1.5" fill="#5d5d5d" />
      <circle cx="238" cy="190" r="1.5" fill="#5d5d5d" />

      {/* Rocket (upper right) */}
      <path d="M210 55 L222 25 L234 55 Z" stroke="#ff6c37" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <rect x="216" y="53" width="12" height="10" rx="2" fill="none" stroke="#ff6c37" strokeWidth="1.5" />
      <path d="M208 55 L204 63" stroke="#ff6c37" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M236 55 L240 63" stroke="#ff6c37" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="222" cy="40" r="5" stroke="#ff6c37" strokeWidth="1.5" />
      {/* Rocket flame */}
      <path d="M217 62 Q222 74 227 62" stroke="#ff6c37" strokeWidth="1.5" fill="none" />

      {/* Dashed tether from hand to rocket */}
      <path d="M202 118 Q215 100 222 65" stroke="#5d5d5d" strokeWidth="0.8" strokeDasharray="3,2.5" fill="none" />

      {/* Moon surface */}
      <path d="M45 210 Q95 200 140 202 Q185 204 235 210" stroke="#5d5d5d" strokeWidth="1.5" fill="none" />
      <path d="M52 210 Q56 204 63 210" stroke="#5d5d5d" strokeWidth="1" fill="none" />
      <path d="M185 207 Q190 201 197 207" stroke="#5d5d5d" strokeWidth="1" fill="none" />

      {/* Astronaut body */}
      <ellipse cx="140" cy="158" rx="33" ry="40" stroke="#5d5d5d" strokeWidth="2" fill="none" />

      {/* Helmet */}
      <circle cx="140" cy="112" r="29" stroke="#5d5d5d" strokeWidth="2" fill="none" />
      {/* Visor */}
      <path d="M120 110 Q140 97 160 110 Q160 127 140 130 Q120 127 120 110 Z"
        fill="#5d5d5d" fillOpacity="0.2" stroke="#5d5d5d" strokeWidth="1.5" />

      {/* Helmet antenna */}
      <line x1="153" y1="85" x2="160" y2="72" stroke="#5d5d5d" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="161" cy="70" r="3" fill="#ff6c37" />

      {/* Neck connector */}
      <rect x="133" y="140" width="14" height="9" rx="2" stroke="#5d5d5d" strokeWidth="1.5" fill="none" />

      {/* Left arm (dangling) */}
      <path d="M109 150 Q88 143 74 148" stroke="#5d5d5d" strokeWidth="9" strokeLinecap="round" fill="none" />
      <circle cx="72" cy="149" r="8" stroke="#5d5d5d" strokeWidth="1.5" fill="none" />

      {/* Right arm (reaching for rocket) */}
      <path d="M171 148 Q193 133 202 120" stroke="#5d5d5d" strokeWidth="9" strokeLinecap="round" fill="none" />
      <circle cx="204" cy="118" r="8" stroke="#5d5d5d" strokeWidth="1.5" fill="none" />

      {/* Legs */}
      <path d="M126 196 L120 212" stroke="#5d5d5d" strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M154 196 L160 212" stroke="#5d5d5d" strokeWidth="9" strokeLinecap="round" fill="none" />
      {/* Boots */}
      <path d="M113 211 Q121 207 129 211 L130 214 Q121 220 113 214 Z" stroke="#5d5d5d" strokeWidth="1.5" fill="none" />
      <path d="M152 211 Q160 207 168 211 L169 214 Q161 220 152 214 Z" stroke="#5d5d5d" strokeWidth="1.5" fill="none" />

      {/* Chest control panel */}
      <rect x="131" y="157" width="18" height="12" rx="2" stroke="#5d5d5d" strokeWidth="1" fill="none" />
      <circle cx="136" cy="163" r="2" fill="#5d5d5d" fillOpacity="0.4" />
      <circle cx="143" cy="163" r="2" fill="#5d5d5d" fillOpacity="0.4" />

      {/* Backpack */}
      <rect x="160" y="143" width="17" height="24" rx="4" stroke="#5d5d5d" strokeWidth="1.5" fill="none" />
      <rect x="163" y="148" width="11" height="10" rx="2" stroke="#5d5d5d" strokeWidth="1" fill="none" />
    </svg>
  );
}

export function ResponsePanel({ tabId }: { tabId: string }) {
  const tabs = useTabStore((s) => s.tabs);
  const updateTabResponse = useTabStore((s) => s.updateTabResponse);
  const tab = tabs.find((t) => t.id === tabId);
  const response = tab?.response ?? null;
  const isLoading = tab?.isLoading ?? false;

  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');
  const [previewMode, setPreviewMode] = useState<'raw' | 'preview'>('raw');
  const codeRef = useRef<HTMLElement>(null);
  const request = tab?.request;

  useEffect(() => {
    if (codeRef.current && response) {
      let code = formatBody(response.body);
      if (response.contentType?.includes('json')) {
        try { code = JSON.stringify(JSON.parse(code), null, 2); } catch {}
      }
      codeRef.current.textContent = code;
      codeRef.current.className = '';
      if (response.contentType?.includes('json')) codeRef.current.classList.add('language-json');
      else if (response.contentType?.includes('html')) codeRef.current.classList.add('language-html');
      else if (response.contentType?.includes('xml')) codeRef.current.classList.add('language-xml');
      hljs.highlightElement(codeRef.current);
    }
  }, [response, previewMode]);

  /* ── Response header bar ── */
  const ResponseHeader = () => (
    <div className="flex items-center px-4 py-2 border-b border-border-primary bg-bg-secondary shrink-0">
      <span className="text-xs font-medium text-text-secondary">Response</span>
      <div className="flex-1" />
      {response && (
        <>
          <span className="mr-2">
            <Badge variant={getStatusVariant(response.status)}>
              {response.status} {response.statusText}
            </Badge>
          </span>
          <span className="flex items-center gap-1 text-[11px] text-text-secondary mr-3">
            <Clock size={11} />
            {response.responseTime}ms
          </span>
          <span className="text-[11px] text-text-secondary mr-3">
            {(response.body.length / 1024).toFixed(2)} KB
          </span>
        </>
      )}
      <ChevronDown size={14} className="text-text-tertiary" />
    </div>
  );

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <ResponseHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-accent-orange/30 border-t-accent-orange rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!response || (response.status === 0 && response.body.length === 0)) {
    return (
      <div className="h-full flex flex-col">
        <ResponseHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8">
          <AstronautIllustration />
          <p className="text-sm text-text-secondary">Enter the URL and click Send to get a response</p>
        </div>
      </div>
    );
  }

  const bodyStr = formatBody(response.body);
  const isHtml = response.contentType?.includes('text/html') ?? false;

  return (
    <div className="h-full flex flex-col">
      <ResponseHeader />

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border-primary bg-bg-secondary shrink-0">
        <SegmentedControl
          options={[
            { value: 'body', label: 'Body' },
            { value: 'headers', label: 'Headers' },
          ]}
          value={activeTab}
          onChange={(v) => setActiveTab(v as 'body' | 'headers')}
        />
        {activeTab === 'body' && isHtml && (
          <SegmentedControl
            options={[
              { value: 'raw', label: 'Raw' },
              { value: 'preview', label: 'Preview' },
            ]}
            value={previewMode}
            onChange={(v) => setPreviewMode(v as 'raw' | 'preview')}
          />
        )}
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onPress={() => updateTabResponse(tabId, null)}>
          <XCircle size={12} /> Clear
        </Button>
        {request && (
          <Button variant="ghost" size="sm" onPress={() => navigator.clipboard.writeText(generateCurl(request))}>
            <Clipboard size={12} /> cURL
          </Button>
        )}
        <Button variant="ghost" size="sm" onPress={() => navigator.clipboard.writeText(bodyStr)}>
          <Clipboard size={12} /> Copy
        </Button>
        <Button variant="ghost" size="sm" onPress={() => {
          const blob = new Blob([new Uint8Array(response.body)], { type: response.contentType ?? '' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `response-${Date.now()}`; a.click();
          URL.revokeObjectURL(url);
        }}>
          <Download size={12} /> Download
        </Button>
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
        ) : isHtml && previewMode === 'preview' ? (
          <iframe
            srcDoc={bodyStr}
            className="w-full h-full border border-border-primary rounded bg-white"
            sandbox="allow-scripts"
          />
        ) : (
          <pre className="text-xs font-mono bg-bg-code text-text-primary rounded p-4 overflow-auto max-h-full">
            <code ref={codeRef} />
          </pre>
        )}
      </div>
    </div>
  );
}
