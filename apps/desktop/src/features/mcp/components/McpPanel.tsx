import hljs from "highlight.js";
import { useState } from "react";
import { selectActiveEnv, useEnvStore } from "@/features/environments";
import { HighlightedHtml } from "@/shared/ui/HighlightedHtml";
import {
  interpolateStrict,
  McpUnresolvedVariablesError,
  parseHeaderLines,
} from "../lib/interpolate";
import { buildToolArgs, isSimpleSchema, type McpResource, type McpTool } from "../lib/toolSchema";
import { McpConnectError, McpProtocolError, McpSession } from "../services/McpSession";
import { getMcpTransport } from "../services/mcpTransport";

type ConnectStatus = "idle" | "connecting" | "connected" | "error";

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function highlightJson(code: string): string {
  try {
    return hljs.highlight(code, { language: "json", ignoreIllegals: true }).value;
  } catch {
    return code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}

export function McpPanel() {
  const activeEnv = useEnvStore(selectActiveEnv);
  const globals = useEnvStore((s) => s.globals);

  const [url, setUrl] = useState("");
  const [headersText, setHeadersText] = useState("");
  const [status, setStatus] = useState<ConnectStatus>("idle");
  const [connectError, setConnectError] = useState<string | null>(null);
  const [session, setSession] = useState<McpSession | null>(null);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [resources, setResources] = useState<McpResource[]>([]);

  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [argValues, setArgValues] = useState<Record<string, string>>({});
  const [rawArgsJson, setRawArgsJson] = useState("{}");
  const [calling, setCalling] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [callResult, setCallResult] = useState<unknown>(undefined);
  const [callTimeMs, setCallTimeMs] = useState<number | null>(null);
  const [rawView, setRawView] = useState(false);

  const tool = tools.find((t) => t.name === selectedTool) ?? null;
  const simple = isSimpleSchema(tool?.inputSchema);

  const handleConnect = async () => {
    setConnectError(null);
    setStatus("connecting");
    try {
      const resolvedUrl = interpolateStrict(url, activeEnv, globals);
      const rawHeaders = parseHeaderLines(headersText);
      const resolvedHeaders: Record<string, string> = {};
      for (const [k, v] of Object.entries(rawHeaders)) {
        resolvedHeaders[k] = interpolateStrict(v, activeEnv, globals);
      }

      const s = new McpSession(getMcpTransport(), resolvedUrl, resolvedHeaders);
      await s.initialize();
      const [toolList, resourceList] = await Promise.all([s.listTools(), s.listResources()]);

      setSession(s);
      setTools(toolList);
      setResources(resourceList);
      setStatus("connected");
      setSelectedTool(toolList[0]?.name ?? null);
    } catch (e) {
      setStatus("error");
      setConnectError(describeError(e));
    }
  };

  const handleDisconnect = () => {
    setSession(null);
    setTools([]);
    setResources([]);
    setSelectedTool(null);
    setCallResult(undefined);
    setCallError(null);
    setStatus("idle");
  };

  const handleCall = async () => {
    if (!(session && tool)) return;
    setCalling(true);
    setCallError(null);
    setCallResult(undefined);
    const started = performance.now();
    try {
      const args = simple
        ? buildToolArgs(tool.inputSchema, argValues)
        : (JSON.parse(rawArgsJson || "{}") as Record<string, unknown>);
      const result = await session.callTool(tool.name, args);
      setCallResult(result);
    } catch (e) {
      setCallError(describeError(e));
    } finally {
      setCallTimeMs(Math.round(performance.now() - started));
      setCalling(false);
    }
  };

  return (
    <div data-testid="mcp-panel" className="flex h-full min-h-0 flex-col">
      {status !== "connected" ? (
        <div className="flex flex-1 flex-col gap-3 p-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Server URL
            </span>
            <input
              data-testid="mcp-connect-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://{{host}}/mcp"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
              className="h-9 rounded border border-border bg-card px-3 font-mono text-xs text-foreground outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Headers (optional, one per line — Key: Value)
            </span>
            <textarea
              data-testid="mcp-connect-headers"
              value={headersText}
              onChange={(e) => setHeadersText(e.target.value)}
              placeholder="Authorization: Bearer {{token}}"
              rows={3}
              spellCheck={false}
              className="resize-none rounded border border-border bg-card px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary"
            />
          </label>
          <button
            type="button"
            data-testid="mcp-connect-btn"
            onClick={handleConnect}
            disabled={!url.trim() || status === "connecting"}
            className="h-9 w-fit rounded bg-primary px-4 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
          >
            {status === "connecting" ? "Connecting…" : "Connect"}
          </button>
          {connectError && (
            <div
              data-testid="mcp-error"
              className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {connectError}
            </div>
          )}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          {/* Tools + resources list */}
          <div className="flex w-[240px] shrink-0 flex-col overflow-y-auto border-r border-border p-2">
            <div className="mb-1.5 flex items-center justify-between px-1">
              <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tools
              </span>
              <button
                type="button"
                onClick={handleDisconnect}
                className="text-2xs text-muted-foreground underline-offset-2 hover:underline"
              >
                Disconnect
              </button>
            </div>
            {tools.length === 0 && (
              <div className="px-1 py-2 text-2xs text-muted-foreground">No tools exposed.</div>
            )}
            {tools.map((t) => (
              <button
                key={t.name}
                type="button"
                data-testid={`mcp-tool-${t.name}`}
                onClick={() => {
                  setSelectedTool(t.name);
                  setArgValues({});
                  setRawArgsJson("{}");
                  setCallResult(undefined);
                  setCallError(null);
                }}
                title={t.description}
                className={`mb-0.5 rounded px-2 py-1.5 text-left text-xs ${
                  selectedTool === t.name
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50"
                }`}
              >
                {t.name}
              </button>
            ))}
            {resources.length > 0 && (
              <>
                <div className="mb-1.5 mt-3 px-1 text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Resources
                </div>
                {resources.map((r) => (
                  <div
                    key={r.uri}
                    className="truncate px-2 py-1 text-2xs text-muted-foreground"
                    title={r.uri}
                  >
                    {r.name ?? r.uri}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Selected tool: form + result */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
            {!tool ? (
              <div className="text-xs text-muted-foreground">Select a tool.</div>
            ) : (
              <>
                <div className="mb-1 text-sm font-semibold text-foreground">{tool.name}</div>
                {tool.description && (
                  <div className="mb-3 text-xs text-muted-foreground">{tool.description}</div>
                )}

                {simple ? (
                  <div className="flex flex-col gap-2.5">
                    {Object.entries(tool.inputSchema?.properties ?? {}).map(([key, prop]) => {
                      const fieldId = `mcp-arg-field-${key}`;
                      return (
                        <div key={key} className="flex flex-col gap-1">
                          <label htmlFor={fieldId} className="text-2xs text-muted-foreground">
                            {key}
                            {tool.inputSchema?.required?.includes(key) && " *"}
                          </label>
                          {prop.enum ? (
                            <select
                              id={fieldId}
                              data-testid={`mcp-arg-${key}`}
                              value={argValues[key] ?? ""}
                              onChange={(e) =>
                                setArgValues((v) => ({ ...v, [key]: e.target.value }))
                              }
                              className="h-8 rounded border border-border bg-card px-2 font-mono text-xs text-foreground outline-none focus:border-primary"
                            >
                              <option value="" />
                              {prop.enum.map((opt) => (
                                <option key={String(opt)} value={String(opt)}>
                                  {String(opt)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              id={fieldId}
                              data-testid={`mcp-arg-${key}`}
                              value={argValues[key] ?? ""}
                              onChange={(e) =>
                                setArgValues((v) => ({ ...v, [key]: e.target.value }))
                              }
                              placeholder={prop.description}
                              className="h-8 rounded border border-border bg-card px-2 font-mono text-xs text-foreground outline-none focus:border-primary"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <label className="flex flex-col gap-1">
                    <span className="text-2xs text-muted-foreground">
                      Arguments (raw JSON — this tool's schema has non-scalar fields)
                    </span>
                    <textarea
                      data-testid="mcp-raw-args"
                      value={rawArgsJson}
                      onChange={(e) => setRawArgsJson(e.target.value)}
                      rows={6}
                      spellCheck={false}
                      className="resize-none rounded border border-border bg-card px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary"
                    />
                  </label>
                )}

                <button
                  type="button"
                  data-testid="mcp-call-btn"
                  onClick={handleCall}
                  disabled={calling}
                  className="mt-3 h-8 w-fit rounded bg-primary px-4 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
                >
                  {calling ? "Calling…" : "Call"}
                </button>

                {callError && (
                  <div
                    data-testid="mcp-error"
                    className="mt-3 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                  >
                    {callError}
                  </div>
                )}

                {callResult !== undefined && !callError && (
                  <div data-testid="mcp-result" className="mt-3 flex min-h-0 flex-1 flex-col">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-2xs text-muted-foreground">
                        {callTimeMs !== null ? `${callTimeMs}ms` : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRawView((v) => !v)}
                        className="text-2xs text-muted-foreground underline-offset-2 hover:underline"
                      >
                        {rawView ? "Pretty" : "Raw"}
                      </button>
                    </div>
                    <div className="min-h-0 flex-1 overflow-auto rounded border border-border bg-card p-3">
                      {rawView ? (
                        <pre className="whitespace-pre-wrap font-mono text-xs text-foreground">
                          {JSON.stringify(callResult)}
                        </pre>
                      ) : (
                        <HighlightedHtml
                          html={highlightJson(prettyJson(callResult))}
                          className="hljs whitespace-pre-wrap font-mono text-xs"
                        />
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function describeError(e: unknown): string {
  if (e instanceof McpUnresolvedVariablesError) return e.message;
  if (e instanceof McpConnectError) return `Couldn't reach the MCP server: ${e.message}`;
  if (e instanceof McpProtocolError) return e.message;
  if (e instanceof SyntaxError) return `Invalid JSON: ${e.message}`;
  return e instanceof Error ? e.message : String(e);
}
