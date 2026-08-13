import { Select } from "@pigeon/ui";
import {
  makeResolver,
  selectActiveEnv,
  useEnvStore,
  useVarAutocomplete,
  VarSuggestions,
} from "@/features/environments";
import type { AuthConfig } from "@/shared/types";
import { VarTextField } from "@/shared/ui/VarTextField";

interface VarAuthEditorProps {
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

function VarField({
  value,
  onChange,
  placeholder,
  type = "text",
  testId,
  showTokens = true,
  inputClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password";
  testId?: string;
  showTokens?: boolean;
  inputClassName?: string;
}) {
  const va = useVarAutocomplete();
  const activeEnv = useEnvStore(selectActiveEnv);
  const globals = useEnvStore((s) => s.globals);
  const resolveToken = makeResolver(activeEnv, globals);

  return (
    <VarTextField
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      testId={testId}
      showTokens={showTokens}
      inputClassName={inputClassName}
      resolveToken={resolveToken}
      autocomplete={{ ...va, Suggestions: VarSuggestions }}
    />
  );
}

/** Auth editor with `{{variable}}` autocomplete, highlighting, and hover tooltips. */
export function VarAuthEditor({
  auth,
  onAuthChange,
  subject = "This request",
}: VarAuthEditorProps) {
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
            <VarField
              value={auth.token}
              onChange={(token) => onAuthChange({ ...auth, token })}
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              testId="auth-token"
              inputClassName="text-method-post"
            />
            <p className="mt-1.5 text-2xs text-muted-foreground">
              Prefix <span className="font-mono">Bearer</span> added automatically. Use{" "}
              <span className="font-mono text-var-token">{"{{NAME}}"}</span> for env variables.
            </p>
          </div>
        </Field>
      )}

      {auth.type === "basic" && (
        <>
          <Field label="Username">
            <VarField
              value={auth.username}
              onChange={(username) => onAuthChange({ ...auth, username })}
              placeholder="username"
              testId="auth-username"
            />
          </Field>
          <Field label="Password">
            <VarField
              value={auth.password}
              onChange={(password) => onAuthChange({ ...auth, password })}
              placeholder="password"
              type="password"
              testId="auth-password"
              showTokens={false}
            />
          </Field>
        </>
      )}

      {auth.type === "api-key" && (
        <>
          <Field label="Key">
            <VarField
              value={auth.apiKey}
              onChange={(apiKey) => onAuthChange({ ...auth, apiKey })}
              placeholder="X-API-Key"
              testId="auth-api-key"
            />
          </Field>
          <Field label="Value">
            <VarField
              value={auth.apiValue}
              onChange={(apiValue) => onAuthChange({ ...auth, apiValue })}
              placeholder="api_key_value"
              testId="auth-api-value"
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
