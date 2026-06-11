import { AuthConfig } from '../types';
import { ChevronDown, Lock } from 'lucide-react';

interface AuthEditorProps {
  auth: AuthConfig;
  onAuthChange: (auth: AuthConfig) => void;
}

const AUTH_DESCRIPTIONS: Record<AuthConfig['type'], string> = {
  none: 'This request does not use any authorization.',
  bearer: 'The authorization header will be automatically generated when you send the request.',
  basic: 'The credentials will be base64 encoded and sent in the Authorization header.',
  'api-key': 'The API key will be added to the request as a header or query parameter.',
};

const inputClass =
  'w-full max-w-lg input-base bg-bg-hover';

const selectClass =
  'select-base max-w-xs bg-bg-hover';

export function AuthEditor({ auth, onAuthChange }: AuthEditorProps) {
  const reset = (type: AuthConfig['type']) =>
    onAuthChange({ ...auth, type, username: '', password: '', token: '', apiKey: '', apiValue: '', apiAddTo: 'header' });

  return (
    <div className="space-y-4">
      {/* Type selector (full width) */}
      <div>
        <label className="text-xs text-text-secondary mb-1.5 block">Type</label>
        <div className="relative max-w-xs">
          <select
            value={auth.type}
            onChange={(e) => reset(e.target.value as AuthConfig['type'])}
            className={selectClass}
          >
            <option value="none">No Auth</option>
            <option value="bearer">Bearer Token</option>
            <option value="basic">Basic Auth</option>
            <option value="api-key">API Key</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-tertiary" />
        </div>
      </div>

      {/* Description text */}
      <p className="text-xs text-text-secondary leading-relaxed max-w-lg">{AUTH_DESCRIPTIONS[auth.type]}</p>

      {/* Fields (full width) — dynamically shown based on type */}
      {auth.type === 'none' && (
        <p className="text-sm text-text-tertiary">No auth fields required.</p>
      )}

      {auth.type === 'bearer' && (
        <div>
          <label className="text-xs text-text-secondary mb-1.5 block">Token</label>
          <input
            type="text"
            value={auth.token}
            onChange={(e) => onAuthChange({ ...auth, token: e.target.value })}
            placeholder="eyJhbGciOiJIUzI1NiIs..."
            className={inputClass}
          />
        </div>
      )}

      {auth.type === 'basic' && (
        <div className="grid grid-cols-2 gap-4 max-w-lg">
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">Username</label>
            <input
              type="text"
              value={auth.username}
              onChange={(e) => onAuthChange({ ...auth, username: e.target.value })}
              placeholder="username"
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">Password</label>
            <input
              type="password"
              value={auth.password}
              onChange={(e) => onAuthChange({ ...auth, password: e.target.value })}
              placeholder="password"
              className={inputClass}
            />
          </div>
        </div>
      )}

      {auth.type === 'api-key' && (
        <>
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block">Key</label>
              <input
                type="text"
                value={auth.apiKey}
                onChange={(e) => onAuthChange({ ...auth, apiKey: e.target.value })}
                placeholder="X-API-Key"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block">Value</label>
              <input
                type="text"
                value={auth.apiValue}
                onChange={(e) => onAuthChange({ ...auth, apiValue: e.target.value })}
                placeholder="api_key_value"
                className={inputClass}
              />
            </div>
          </div>
          <div className="max-w-xs">
            <label className="text-xs text-text-secondary mb-1.5 block">Add to</label>
            <div className="relative">
              <select
                value={auth.apiAddTo}
                onChange={(e) => onAuthChange({ ...auth, apiAddTo: e.target.value as 'header' | 'query' })}
                className={selectClass}
              >
                <option value="header">Header</option>
                <option value="query">Query Params</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-tertiary" />
            </div>
          </div>
        </>
      )}

      {/* Vault banner — collapsible (details/summary) */}
      <details className="group max-w-lg">
        <summary className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer
          py-2 px-3 bg-bg-hover rounded-md hover:bg-bg-active transition-colors list-none">
          <Lock size={14} className="shrink-0" />
          <span>Store your secrets with Vault</span>
          <span className="flex-1" />
          <ChevronDown size={12} className="text-text-tertiary transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-2 px-3 py-2">
          <p className="text-xs text-text-tertiary mb-2">
            Store your secrets with end-to-end encryption locally using Vault.
          </p>
          <button           className="btn-secondary">
            Store in Vault
          </button>
        </div>
      </details>
    </div>
  );
}
