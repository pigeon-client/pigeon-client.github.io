import { Input, Select, Textarea } from "@pigeon/ui";
import { useEffect, useState } from "react";
import { interpolateStrict, UnresolvedVariablesError } from "@/core/interpolation";
import { isTauri } from "@/shared/lib/platform";
import type { Header } from "@/shared/types";
import { HighlightedBody } from "@/shared/ui/result-viewer";
import { VarKeyValueEditor } from "../../environments/components/VarKeyValueEditor";
import { makeResolver } from "../../environments/lib/resolve";
import { selectActiveEnv, useEnvStore } from "../../environments/store";
import { buildToolArgs, isSimpleSchema } from "../lib/toolSchema";
import { canonicalizeServerUrl } from "../oauth/canonicalUri";
import {
  OauthFlowError,
  OauthManualClientRequiredError,
  runAuthorizationCodeFlow,
} from "../oauth/OauthFlow";
import { getMcpOauth } from "../oauth/oauthDb";
import {
  McpAuthRequiredError,
  McpConnectError,
  McpProtocolError,
  McpSession,
} from "../services/McpSession";
import { getMcpTransport } from "../services/mcpTransport";
import { useMcpTab } from "../store";

interface PendingConnect {
  url: string;
  headers: Record<string, string>;
  wwwAuthenticate: string | undefined;
}

function prettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function McpPanel({ tabId }: { tabId: string }) {
  const activeEnv = useEnvStore(selectActiveEnv);
  const globals = useEnvStore((s) => s.globals);
  const { state: mcp, patch, remove } = useMcpTab(tabId);

  // Connect-form / auth-flow input ephemera — never needed by the sidebar, stays local.
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<Header[]>([]);
  const [pendingConnect, setPendingConnect] = useState<PendingConnect | null>(null);
  const [authorizing, setAuthorizing] = useState(false);
  const [authStatusText, setAuthStatusText] = useState<string | null>(null);
  const [manualRequired, setManualRequired] = useState(false);
  const [manualClientId, setManualClientId] = useState("");
  const [manualClientSecret, setManualClientSecret] = useState("");
  const [manualScope, setManualScope] = useState("");

  useEffect(() => remove, [remove]);

  const tool = mcp.tools.find((t) => t.name === mcp.selectedTool) ?? null;
  const simple = isSimpleSchema(tool?.inputSchema);

  /** Connects (attaching a cached OAuth token, if any) and lists tools/resources. */
  const attemptConnect = async (resolvedUrl: string, headers: Record<string, string>) => {
    let finalHeaders = headers;
    let cachedServerUrl: string | null = null;
    if (isTauri()) {
      try {
        cachedServerUrl = canonicalizeServerUrl(resolvedUrl);
        const cached = await getMcpOauth(cachedServerUrl);
        if (cached) finalHeaders = { ...headers, Authorization: `Bearer ${cached.accessToken}` };
      } catch {
        // Not resolvable to a canonical URI yet, or no cached record — connect unauthenticated.
      }
    }

    const s = new McpSession(getMcpTransport(), resolvedUrl, finalHeaders);
    await s.initialize();
    const [toolList, resourceList] = await Promise.all([s.listTools(), s.listResources()]);

    patch({
      session: s,
      tools: toolList,
      resources: resourceList,
      status: "connected",
      selectedTool: toolList[0]?.name ?? null,
      authorizedServerUrl: cachedServerUrl && finalHeaders.Authorization ? cachedServerUrl : null,
    });
    setPendingConnect(null);
    setManualRequired(false);
  };

  const handleConnect = async () => {
    patch({ connectError: null, status: "connecting" });
    let resolvedUrl = "";
    let resolvedHeaders: Record<string, string> = {};
    try {
      const resolve = makeResolver(activeEnv, globals);
      resolvedUrl = interpolateStrict(url, resolve);
      resolvedHeaders = {};
      for (const h of headers) {
        if (h.enabled && h.key) resolvedHeaders[h.key] = interpolateStrict(h.value, resolve);
      }
      await attemptConnect(resolvedUrl, resolvedHeaders);
    } catch (e) {
      if (e instanceof McpAuthRequiredError) {
        setPendingConnect({
          url: resolvedUrl,
          headers: resolvedHeaders,
          wwwAuthenticate: e.wwwAuthenticate,
        });
        patch({ status: "auth-required" });
        return;
      }
      patch({ status: "error", connectError: describeError(e) });
    }
  };

  const handleAuthorize = async () => {
    if (!pendingConnect) return;
    setAuthorizing(true);
    patch({ connectError: null });
    try {
      await runAuthorizationCodeFlow(pendingConnect.url, pendingConnect.wwwAuthenticate, {
        manualClient: manualRequired
          ? {
              clientId: manualClientId.trim(),
              clientSecret: manualClientSecret.trim() || undefined,
              scope: manualScope.trim() || undefined,
            }
          : undefined,
        onStatus: setAuthStatusText,
      });
      setManualRequired(false);
      patch({ status: "connecting" });
      await attemptConnect(pendingConnect.url, pendingConnect.headers);
    } catch (e) {
      if (e instanceof OauthManualClientRequiredError) {
        setManualRequired(true);
        patch({ connectError: e.message });
      } else {
        patch({ status: "auth-required", connectError: describeError(e) });
      }
    } finally {
      setAuthorizing(false);
      setAuthStatusText(null);
    }
  };

  const handleBackToConnect = () => {
    setPendingConnect(null);
    setManualRequired(false);
    patch({ connectError: null, status: "idle" });
  };

  const handleCall = async () => {
    if (!(mcp.session && tool)) return;
    patch({ calling: true, callError: null, callResult: undefined });
    const started = performance.now();
    try {
      const args = simple
        ? buildToolArgs(tool.inputSchema, mcp.argValues)
        : (JSON.parse(mcp.rawArgsJson || "{}") as Record<string, unknown>);
      const result = await mcp.session.callTool(tool.name, args);
      patch({ callResult: result });
    } catch (e) {
      patch({ callError: describeError(e) });
    } finally {
      patch({ callTimeMs: Math.round(performance.now() - started), calling: false });
    }
  };

  return (
    <div data-testid="mcp-panel" className="flex h-full min-h-0 flex-col">
      {mcp.status === "auth-required" ? (
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div className="rounded border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
            This MCP server requires authorization.
          </div>
          {manualRequired && (
            <>
              <label htmlFor="mcp-oauth-client-id" className="flex flex-col gap-1.5">
                <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Client ID
                </span>
                <Input
                  id="mcp-oauth-client-id"
                  data-testid="mcp-oauth-client-id"
                  size="lg"
                  value={manualClientId}
                  onChange={(e) => setManualClientId(e.target.value)}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  autoComplete="off"
                />
              </label>
              <label htmlFor="mcp-oauth-client-secret" className="flex flex-col gap-1.5">
                <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Client Secret (optional)
                </span>
                <Input
                  id="mcp-oauth-client-secret"
                  data-testid="mcp-oauth-client-secret"
                  type="password"
                  size="lg"
                  value={manualClientSecret}
                  onChange={(e) => setManualClientSecret(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                />
              </label>
              <label htmlFor="mcp-oauth-scope" className="flex flex-col gap-1.5">
                <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Scope (optional)
                </span>
                <Input
                  id="mcp-oauth-scope"
                  data-testid="mcp-oauth-scope"
                  size="lg"
                  value={manualScope}
                  onChange={(e) => setManualScope(e.target.value)}
                  spellCheck={false}
                  autoComplete="off"
                />
              </label>
            </>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="mcp-authorize-btn"
              onClick={handleAuthorize}
              disabled={authorizing || (manualRequired && !manualClientId.trim())}
              className="h-9 w-fit rounded bg-primary px-4 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
            >
              {authorizing ? (authStatusText ?? "Authorizing…") : "Authorize in Browser"}
            </button>
            <button
              type="button"
              onClick={handleBackToConnect}
              disabled={authorizing}
              className="h-9 w-fit rounded border border-border px-4 text-xs font-semibold text-foreground transition-opacity disabled:opacity-50"
            >
              Back
            </button>
          </div>
          {mcp.connectError && (
            <div
              data-testid="mcp-error"
              className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {mcp.connectError}
            </div>
          )}
        </div>
      ) : mcp.status !== "connected" ? (
        <div className="flex flex-1 flex-col gap-3 p-5">
          <label htmlFor="mcp-connect-url" className="flex flex-col gap-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Server URL
            </span>
            <Input
              id="mcp-connect-url"
              data-testid="mcp-connect-url"
              size="lg"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://{{host}}/mcp"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
            />
          </label>
          <div className="flex flex-col gap-1.5">
            <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
              Headers (optional)
            </span>
            <VarKeyValueEditor
              items={headers}
              onChange={setHeaders}
              testId="mcp-connect-header"
              addLabel="Add header"
            />
          </div>
          <button
            type="button"
            data-testid="mcp-connect-btn"
            onClick={handleConnect}
            disabled={!url.trim() || mcp.status === "connecting"}
            className="h-9 w-fit rounded bg-primary px-4 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
          >
            {mcp.status === "connecting" ? "Connecting…" : "Connect"}
          </button>
          {mcp.connectError && (
            <div
              data-testid="mcp-error"
              className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {mcp.connectError}
            </div>
          )}
        </div>
      ) : (
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
                          <Select
                            id={fieldId}
                            data-testid={`mcp-arg-${key}`}
                            size="md"
                            value={mcp.argValues[key] ?? ""}
                            onChange={(e) =>
                              patch({ argValues: { ...mcp.argValues, [key]: e.target.value } })
                            }
                          >
                            <option value="" />
                            {prop.enum.map((opt) => (
                              <option key={String(opt)} value={String(opt)}>
                                {String(opt)}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <Input
                            id={fieldId}
                            data-testid={`mcp-arg-${key}`}
                            size="md"
                            value={mcp.argValues[key] ?? ""}
                            onChange={(e) =>
                              patch({ argValues: { ...mcp.argValues, [key]: e.target.value } })
                            }
                            placeholder={prop.description}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <label htmlFor="mcp-raw-args" className="flex flex-col gap-1">
                  <span className="text-2xs text-muted-foreground">
                    Arguments (raw JSON — this tool's schema has non-scalar fields)
                  </span>
                  <Textarea
                    id="mcp-raw-args"
                    data-testid="mcp-raw-args"
                    value={mcp.rawArgsJson}
                    onChange={(e) => patch({ rawArgsJson: e.target.value })}
                    rows={6}
                    spellCheck={false}
                    className="min-h-0"
                  />
                </label>
              )}

              <button
                type="button"
                data-testid="mcp-call-btn"
                onClick={handleCall}
                disabled={mcp.calling}
                className="mt-3 h-8 w-fit rounded bg-primary px-4 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
              >
                {mcp.calling ? "Calling…" : "Call"}
              </button>

              {mcp.callError && (
                <div
                  data-testid="mcp-error"
                  className="mt-3 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
                >
                  {mcp.callError}
                </div>
              )}

              {mcp.callResult !== undefined && !mcp.callError && (
                <div data-testid="mcp-result" className="mt-3 flex min-h-0 flex-1 flex-col">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-2xs text-muted-foreground">
                      {mcp.callTimeMs !== null ? `${mcp.callTimeMs}ms` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => patch({ rawView: !mcp.rawView })}
                      className="text-2xs text-muted-foreground underline-offset-2 hover:underline"
                    >
                      {mcp.rawView ? "Pretty" : "Raw"}
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto rounded border border-border bg-card p-3">
                    {mcp.rawView ? (
                      <pre className="whitespace-pre-wrap font-mono text-xs text-foreground">
                        {JSON.stringify(mcp.callResult)}
                      </pre>
                    ) : (
                      <HighlightedBody
                        code={prettyJson(mcp.callResult)}
                        language="json"
                        className="hljs whitespace-pre-wrap font-mono text-xs"
                      />
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function describeError(e: unknown): string {
  if (e instanceof UnresolvedVariablesError) return e.message;
  if (e instanceof McpConnectError) return `Couldn't reach the MCP server: ${e.message}`;
  if (e instanceof OauthFlowError) return e.message;
  if (e instanceof McpProtocolError) return e.message;
  if (e instanceof SyntaxError) return `Invalid JSON: ${e.message}`;
  return e instanceof Error ? e.message : String(e);
}
