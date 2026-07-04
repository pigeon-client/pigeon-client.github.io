import type { AuthConfig } from "../types";

interface AuthEditorProps {
  auth: AuthConfig;
  onAuthChange: (auth: AuthConfig) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="w-16 shrink-0 pt-2 text-xs text-muted-foreground">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function AuthEditor({ auth, onAuthChange }: AuthEditorProps) {
  const reset = (type: AuthConfig["type"]) =>
    onAuthChange({
      ...auth,
      type,
      username: "",
      password: "",
      token: "",
      apiKey: "",
      apiValue: "",
      apiAddTo: "header",
    });

  return (
    <div className="flex max-w-[560px] flex-col gap-3.5">
      {/* Type selector */}
      <Field label="Type">
        <div className="relative flex h-8 w-[220px] items-center justify-between rounded border border-border bg-card px-3 text-[13px] text-foreground">
          <select
            value={auth.type}
            onChange={(e) => reset(e.target.value as AuthConfig["type"])}
            className="absolute inset-0 cursor-pointer appearance-none bg-transparent px-3 font-[inherit] text-[13px] text-foreground outline-none"
          >
            <option value="none">No Auth</option>
            <option value="bearer">Bearer Token</option>
            <option value="basic">Basic Auth</option>
            <option value="api-key">API Key</option>
          </select>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="pointer-events-none ml-auto text-muted-foreground"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </Field>

      {/* None */}
      {auth.type === "none" && (
        <p className="m-0 text-xs text-muted-foreground">
          This request does not use any authorization.
        </p>
      )}

      {/* Bearer */}
      {auth.type === "bearer" && (
        <Field label="Token">
          <div>
            <input
              type="text"
              value={auth.token}
              onChange={(e) => onAuthChange({ ...auth, token: e.target.value })}
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              className="h-8 w-full rounded border border-border bg-card px-3 font-mono text-xs text-method-post outline-none"
            />
            <div className="mt-1.5 text-[11.5px] text-muted-foreground">
              Prefix <span className="font-mono">Bearer</span> added automatically
            </div>
          </div>
        </Field>
      )}

      {/* Basic */}
      {auth.type === "basic" && (
        <>
          <Field label="Username">
            <input
              type="text"
              value={auth.username}
              onChange={(e) => onAuthChange({ ...auth, username: e.target.value })}
              placeholder="username"
              className="h-8 w-full rounded border border-border bg-card px-3 font-mono text-[12.5px] text-foreground outline-none"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              value={auth.password}
              onChange={(e) => onAuthChange({ ...auth, password: e.target.value })}
              placeholder="password"
              className="h-8 w-full rounded border border-border bg-card px-3 font-mono text-[12.5px] text-foreground outline-none"
            />
          </Field>
        </>
      )}

      {/* API Key */}
      {auth.type === "api-key" && (
        <>
          <Field label="Key">
            <input
              type="text"
              value={auth.apiKey}
              onChange={(e) => onAuthChange({ ...auth, apiKey: e.target.value })}
              placeholder="X-API-Key"
              className="h-8 w-full rounded border border-border bg-card px-3 font-mono text-[12.5px] text-foreground outline-none"
            />
          </Field>
          <Field label="Value">
            <input
              type="text"
              value={auth.apiValue}
              onChange={(e) => onAuthChange({ ...auth, apiValue: e.target.value })}
              placeholder="api_key_value"
              className="h-8 w-full rounded border border-border bg-card px-3 font-mono text-[12.5px] text-foreground outline-none"
            />
          </Field>
          <Field label="Add to">
            <select
              value={auth.apiAddTo}
              onChange={(e) =>
                onAuthChange({ ...auth, apiAddTo: e.target.value as "header" | "query" })
              }
              className="h-8 w-[180px] cursor-pointer appearance-none rounded border border-border bg-card px-3 font-[inherit] text-[12.5px] text-foreground outline-none"
            >
              <option value="header">Header</option>
              <option value="query">Query Params</option>
            </select>
          </Field>
        </>
      )}
    </div>
  );
}
