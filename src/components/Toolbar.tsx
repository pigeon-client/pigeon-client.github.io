import { Download, Settings } from "lucide-react";
import pigeonLogo from "../assets/pigeon-logo-32.png";
import { useEnvStore } from "../store/envStore";
import { Button } from "./ui/Button";

interface ToolbarProps {
  onOpenEnv: () => void;
  onOpenSettings: () => void;
  onExportCurl: () => void;
}

export function Toolbar({ onOpenEnv: _onOpenEnv, onOpenSettings, onExportCurl }: ToolbarProps) {
  return (
    <div
      className="flex-none flex items-center gap-[14px] px-[14px]"
      style={{
        height: 44,
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-[10px]">
        <img
          src={pigeonLogo}
          alt="Pigeon"
          className="pg-logo"
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            objectFit: "contain",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>Pigeon</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: "var(--text-secondary)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            padding: "2px 6px",
            borderRadius: 5,
            letterSpacing: "0.02em",
          }}
        >
          v1.0
        </span>
      </div>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-[8px]">
        <Button variant="ghost-icon" size="icon" onClick={onExportCurl} title="Export cURL">
          <Download size={16} />
        </Button>
        <Button variant="ghost-icon" size="icon" onClick={onOpenSettings} title="Settings">
          <Settings size={16} />
        </Button>
      </div>
    </div>
  );
}

/* ── Environment selector — shown inside Toolbar for backward compat ── */
export function EnvSelector() {
  const environments = useEnvStore((s) => s.environments);
  const activeEnv = useEnvStore((s) => s.activeEnv);
  const setActiveEnv = useEnvStore((s) => s.setActiveEnv);

  if (environments.length === 0) return null;

  return (
    <select
      value={activeEnv?.id ?? ""}
      onChange={(e) => {
        const id = e.target.value;
        if (!id) setActiveEnv(null);
        else setActiveEnv(environments.find((env) => String(env.id) === id) ?? null);
      }}
      style={{
        appearance: "none",
        height: 30,
        padding: "0 28px 0 10px",
        fontSize: 12,
        background: "var(--bg-elevated)",
        color: "var(--text-primary)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      <option value="">No Environment</option>
      {environments.map((env) => (
        <option key={env.id} value={env.id}>
          {env.name}
        </option>
      ))}
    </select>
  );
}
