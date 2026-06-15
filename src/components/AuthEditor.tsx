import type { AuthConfig } from "../types";

interface AuthEditorProps {
  auth: AuthConfig;
  onAuthChange: (auth: AuthConfig) => void;
}

const inputStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  height: 34,
  padding: "0 12px",
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontFamily: "var(--font-mono)",
  fontSize: 12.5,
  color: "var(--text-primary)",
  width: "100%",
  outline: "none",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
      <span
        style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          width: 64,
          paddingTop: 9,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1 }}>{children}</div>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 560 }}>
      {/* Type selector */}
      <Field label="Type">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: 220,
            height: 34,
            padding: "0 12px",
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontSize: 13,
            color: "var(--text-primary)",
            cursor: "pointer",
            position: "relative",
          }}
        >
          <select
            value={auth.type}
            onChange={(e) => reset(e.target.value as AuthConfig["type"])}
            style={{
              appearance: "none",
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              padding: "0 12px",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontFamily: "inherit",
              fontSize: 13,
              cursor: "pointer",
            }}
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
            stroke="var(--text-secondary)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ pointerEvents: "none", marginLeft: "auto" }}
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </Field>

      {/* None */}
      {auth.type === "none" && (
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
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
              style={{ ...inputStyle, color: "#4ADE80" }}
            />
            <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 7 }}>
              Prefix{" "}
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                Bearer
              </span>{" "}
              added automatically
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
              style={inputStyle}
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              value={auth.password}
              onChange={(e) => onAuthChange({ ...auth, password: e.target.value })}
              placeholder="password"
              style={inputStyle}
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
              style={inputStyle}
            />
          </Field>
          <Field label="Value">
            <input
              type="text"
              value={auth.apiValue}
              onChange={(e) => onAuthChange({ ...auth, apiValue: e.target.value })}
              placeholder="api_key_value"
              style={inputStyle}
            />
          </Field>
          <Field label="Add to">
            <select
              value={auth.apiAddTo}
              onChange={(e) =>
                onAuthChange({ ...auth, apiAddTo: e.target.value as "header" | "query" })
              }
              style={{ ...inputStyle, width: 180, cursor: "pointer", appearance: "none" }}
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
