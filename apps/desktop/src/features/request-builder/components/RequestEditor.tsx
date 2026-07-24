import { useCallback, useState } from "react";
import { applyParamsToUrl } from "@/shared/lib/url";
import type { AuthConfig, BodyType, Header, KeyValue } from "@/shared/types";
import { CountBadge } from "@/shared/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useTabStore } from "../store";
import { AuthEditor } from "./AuthEditor";
import { BodyEditor } from "./BodyEditor";
import { HeadersEditor } from "./HeadersEditor";
import { KeyValueEditor } from "./KeyValueEditor";

type RequestTab = "params" | "headers" | "body" | "auth";

interface RequestEditorProps {
  tabId: string;
}

export function RequestEditor({ tabId }: RequestEditorProps) {
  const request = useTabStore((s) => s.tabs.find((t) => t.id === tabId)?.request);
  const updateTabRequest = useTabStore((s) => s.updateTabRequest);
  const [activeTab, setActiveTab] = useState<RequestTab>("params");

  // Editing params rewrites the URL's query so both views stay in sync.
  const onParamsChange = useCallback(
    (params: KeyValue[]) =>
      updateTabRequest(tabId, { params, url: applyParamsToUrl(request?.url ?? "", params) }),
    [tabId, updateTabRequest, request?.url],
  );

  const onHeadersChange = useCallback(
    (headers: Header[]) => updateTabRequest(tabId, { headers }),
    [tabId, updateTabRequest],
  );

  const onBodyChange = useCallback(
    (body: string) => updateTabRequest(tabId, { body }),
    [tabId, updateTabRequest],
  );

  const onBodyTypeChange = useCallback(
    (bodyType: BodyType) => updateTabRequest(tabId, { bodyType }),
    [tabId, updateTabRequest],
  );

  const onFormDataChange = useCallback(
    (formData: KeyValue[]) => updateTabRequest(tabId, { formData }),
    [tabId, updateTabRequest],
  );

  const onMultipartChange = useCallback(
    (multipart: KeyValue[]) => updateTabRequest(tabId, { multipart }),
    [tabId, updateTabRequest],
  );

  const onFileChange = useCallback(
    (file: File | null) => updateTabRequest(tabId, { file }),
    [tabId, updateTabRequest],
  );

  const onAuthChange = useCallback(
    (auth: AuthConfig) => updateTabRequest(tabId, { auth }),
    [tabId, updateTabRequest],
  );

  if (!request) return null;

  const paramCount = request.params.filter((p) => p.key.trim()).length;
  const headerCount = request.headers.filter((h) => h.key.trim()).length;
  const hasBody =
    request.bodyType !== "none" && (request.body.trim() || request.formData?.some((f) => f.key));
  const hasAuth = request.auth.type !== "none";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-b border-border bg-background">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as RequestTab)}
        className="flex min-h-0 min-w-0 flex-1 flex-col px-4 pt-1"
      >
        <TabsList variant="underline" className="w-full shrink-0 justify-start overflow-x-auto">
          <TabsTrigger variant="underline" value="params" data-testid="editor-tab-params">
            Params
            {paramCount > 0 && <CountBadge count={paramCount} active={activeTab === "params"} />}
          </TabsTrigger>
          <TabsTrigger variant="underline" value="auth" data-testid="editor-tab-auth">
            Auth
            {hasAuth && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-primary" />}
          </TabsTrigger>
          <TabsTrigger variant="underline" value="headers" data-testid="editor-tab-headers">
            Headers
            {headerCount > 0 && <CountBadge count={headerCount} active={activeTab === "headers"} />}
          </TabsTrigger>
          <TabsTrigger variant="underline" value="body" data-testid="editor-tab-body">
            Body
            {hasBody && (
              <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-status-2xx" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="params"
          className="m-0 min-h-0 min-w-0 flex-1 overflow-auto px-4 py-2.5"
        >
          <KeyValueEditor
            items={request.params}
            onChange={onParamsChange}
            keyPlaceholder="Key"
            valuePlaceholder="Value"
            testId="param"
          />
        </TabsContent>
        <TabsContent
          value="headers"
          className="m-0 min-h-0 min-w-0 flex-1 overflow-auto px-4 py-2.5"
        >
          <HeadersEditor headers={request.headers} onHeadersChange={onHeadersChange} />
        </TabsContent>
        <TabsContent
          value="body"
          className="m-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-auto"
        >
          <BodyEditor
            bodyType={request.bodyType}
            body={request.body}
            formData={request.formData}
            multipart={request.multipart}
            file={request.file}
            onBodyChange={onBodyChange}
            onFormDataChange={onFormDataChange}
            onBodyTypeChange={onBodyTypeChange}
            onMultipartChange={onMultipartChange}
            onFileChange={onFileChange}
          />
        </TabsContent>
        <TabsContent value="auth" className="m-0 min-h-0 min-w-0 flex-1 overflow-auto px-4 py-4">
          <AuthEditor auth={request.auth} onAuthChange={onAuthChange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
