import { AuthConfig } from '../types';
import { ChevronDown, ExternalLink, Lock } from 'lucide-react';

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
  'w-full px-3 py-3 text-sm bg-bg-hover text-text-primary border border-border-primary rounded ' +
  'placeholder:text-text-tertiary focus:outline-none focus:border-accent-orange/60 transition-colors';

export function AuthEditor({ auth, onAuthChange }: AuthEditorProps) {
  const reset = (type: AuthConfig['type']) =>
    onAuthChange({ ...auth, type, username: '', password: '', token: '', apiKey: '', apiValue: '', apiAddTo: 'header' });

  return (
    <div className="flex flex-col" style={{ minHeight: '280px' }}>
      {/* Two-panel body */}
      <div className="flex flex-1">
        {/* Left: Type selector */}
        <div className="w-80 shrink-0 pr-5 border-r border-border-primary space-y-3">
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">Type</label>
            <div className="relative">
              <select
                value={auth.type}
                onChange={(e) => reset(e.target.value as AuthConfig['type'])}
                className="w-full appearance-none px-3 py-3 text-sm bg-bg-hover text-text-primary border border-border-primary rounded cursor-pointer focus:outline-none"
              >
                <option value="none">No Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="api-key">API Key</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-tertiary" />
            </div>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">{AUTH_DESCRIPTIONS[auth.type]}</p>
          <button className="flex items-center gap-1 text-xs text-accent-orange hover:underline cursor-pointer">
            Learn more about authorization <ExternalLink size={11} />
          </button>
        </div>

        {/* Right: Fields */}
        <div className="flex-1 pl-6 space-y-3">
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
            <>
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
            </>
          )}

          {auth.type === 'api-key' && (
            <>
              <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label className="text-xs text-text-secondary mb-1.5 block">Add to</label>
                <div className="relative w-48">
                  <select
                    value={auth.apiAddTo}
                    onChange={(e) => onAuthChange({ ...auth, apiAddTo: e.target.value as 'header' | 'query' })}
                    className="w-full appearance-none px-3 py-3 text-sm bg-bg-hover text-text-primary border border-border-primary rounded cursor-pointer focus:outline-none"
                  >
                    <option value="header">Header</option>
                    <option value="query">Query Params</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-tertiary" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom: Vault banner */}
      <div className="flex items-center gap-3 mt-6 pt-3 border-t border-border-primary">
        <Lock size={16} className="text-text-tertiary shrink-0" />
        <span className="text-xs text-text-secondary flex-1">
          Store your secrets with end-to-end encryption locally using Vault.
        </span>
        <button className="px-3 py-1.5 text-xs text-text-secondary border border-border-primary rounded hover:bg-bg-hover transition-colors shrink-0">
          Store in Vault
        </button>
      </div>
    </div>
  );
}
