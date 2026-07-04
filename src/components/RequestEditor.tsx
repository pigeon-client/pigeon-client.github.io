import { useCallback, useState } from "react";
import { CountBadge } from "@/shared/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { useTabStore } from "../store/tabStore";
import type { AuthConfig, BodyType, Header, KeyValue } from "../types";
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

  const onParamsChange = useCallback(
    (params: KeyValue[]) => updateTabRequest(tabId, { params }),
    [tabId, updateTabRequest],
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-b border-border bg-background">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as RequestTab)}
        className="flex min-h-0 flex-1 flex-col px-4 pt-1"
      >
        <TabsList variant="underline" className="w-full justify-start">
          <TabsTrigger variant="underline" value="params">
            Params
            {paramCount > 0 && <CountBadge count={paramCount} active={activeTab === "params"} />}
          </TabsTrigger>
          <TabsTrigger variant="underline" value="headers">
            Headers
            {headerCount > 0 && <CountBadge count={headerCount} active={activeTab === "headers"} />}
          </TabsTrigger>
          <TabsTrigger variant="underline" value="body">
            Body
            {hasBody && (
              <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-status-2xx" />
            )}
          </TabsTrigger>
          <TabsTrigger variant="underline" value="auth">
            Auth
            {hasAuth && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-primary" />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="params" className="m-0 px-4 py-2.5">
          <KeyValueEditor
            items={request.params}
            onChange={onParamsChange}
            keyPlaceholder="Key"
            valuePlaceholder="Value"
          />
        </TabsContent>
        <TabsContent value="headers" className="m-0 px-4 py-2.5">
          <HeadersEditor headers={request.headers} onHeadersChange={onHeadersChange} />
        </TabsContent>
        <TabsContent value="body" className="m-0 flex min-h-0 flex-1 flex-col">
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
        <TabsContent value="auth" className="m-0 px-4 py-4">
          <AuthEditor auth={request.auth} onAuthChange={onAuthChange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
