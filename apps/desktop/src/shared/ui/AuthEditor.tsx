import { Input, Select } from "@pigeon/ui";
import type { AuthConfig } from "@/shared/types";

interface AuthEditorProps {
  auth: AuthConfig;
  onAuthChange: (auth: AuthConfig) => void;
  /** Subject of the "no auth" hint text (default "This request"). */
  subject?: string;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="w-16 shrink-0 pt-2 text-xs text-muted-foreground">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function AuthEditor({ auth, onAuthChange, subject = "This request" }: AuthEditorProps) {
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
      <Field label="Type">
        <Select
          value={auth.type}
          onChange={(e) => reset(e.target.value as AuthConfig["type"])}
          className="w-[220px]"
          mono={false}
        >
          <option value="none">No Auth</option>
          <option value="bearer">Bearer Token</option>
          <option value="basic">Basic Auth</option>
          <option value="api-key">API Key</option>
        </Select>
      </Field>

      {auth.type === "none" && (
        <p className="m-0 text-xs text-muted-foreground">
          {subject} does not use any authorization.
        </p>
      )}

      {auth.type === "bearer" && (
        <Field label="Token">
          <div>
            <Input
              type="text"
              value={auth.token}
              onChange={(e) => onAuthChange({ ...auth, token: e.target.value })}
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              className="text-method-post"
            />
            <p className="mt-1.5 text-2xs text-muted-foreground">
              Prefix <span className="font-mono">Bearer</span> added automatically
            </p>
          </div>
        </Field>
      )}

      {auth.type === "basic" && (
        <>
          <Field label="Username">
            <Input
              type="text"
              value={auth.username}
              onChange={(e) => onAuthChange({ ...auth, username: e.target.value })}
              placeholder="username"
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={auth.password}
              onChange={(e) => onAuthChange({ ...auth, password: e.target.value })}
              placeholder="password"
            />
          </Field>
        </>
      )}

      {auth.type === "api-key" && (
        <>
          <Field label="Key">
            <Input
              type="text"
              value={auth.apiKey}
              onChange={(e) => onAuthChange({ ...auth, apiKey: e.target.value })}
              placeholder="X-API-Key"
            />
          </Field>
          <Field label="Value">
            <Input
              type="text"
              value={auth.apiValue}
              onChange={(e) => onAuthChange({ ...auth, apiValue: e.target.value })}
              placeholder="api_key_value"
            />
          </Field>
          <Field label="Add to">
            <Select
              value={auth.apiAddTo}
              onChange={(e) =>
                onAuthChange({ ...auth, apiAddTo: e.target.value as "header" | "query" })
              }
              className="w-[180px]"
              mono={false}
            >
              <option value="header">Header</option>
              <option value="query">Query Params</option>
            </Select>
          </Field>
        </>
      )}
    </div>
  );
}
