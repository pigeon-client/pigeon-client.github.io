import { useState } from "react";
import { useTabStore } from "../store/tabStore";
import { AuthEditor } from "./AuthEditor";
import { BodyEditor } from "./BodyEditor";
import { HeadersEditor } from "./HeadersEditor";
import { KeyValueEditor } from "./KeyValueEditor";
import { CountBadge } from "./ui/Badge";
import { Tab } from "./ui/Tab";

type RequestTab = "params" | "headers" | "body" | "auth";

interface RequestEditorProps {
  tabId: string;
}

export function RequestEditor({ tabId }: RequestEditorProps) {
  const tabs = useTabStore((s) => s.tabs);
  const updateTabRequest = useTabStore((s) => s.updateTabRequest);
  const tab = tabs.find((t) => t.id === tabId);
  const [activeTab, setActiveTab] = useState<RequestTab>("params");

  if (!tab) return null;
  const { request } = tab;

  const paramCount = request.params.filter((p) => p.key.trim()).length;
  const headerCount = request.headers.filter((h) => h.key.trim()).length;
  const hasBody =
    request.bodyType !== "none" && (request.body.trim() || request.formData?.some((f) => f.key));
  const hasAuth = request.auth.type !== "none";

  const tabDefs: { id: RequestTab; label: string; badge?: number; dot?: string }[] = [
    { id: "params", label: "Params", badge: paramCount || undefined },
    { id: "headers", label: "Headers", badge: headerCount || undefined },
    { id: "body", label: "Body", dot: hasBody ? "#4ADE80" : undefined },
    { id: "auth", label: "Auth", dot: hasAuth ? "var(--accent)" : undefined },
  ];

  return (
    <div
      style={{
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: "0 18px",
          height: 38,
          borderBottom: "1px solid var(--border)",
        }}
      >
        {tabDefs.map((t) => (
          <Tab key={t.id} active={activeTab === t.id} onClick={() => setActiveTab(t.id)}>
            {t.label}
            {t.badge != null && <CountBadge count={t.badge} active={activeTab === t.id} />}
            {t.dot && (
              <span
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: t.dot,
                }}
              />
            )}
          </Tab>
        ))}
      </div>

      {/* Content — fixed height 200px */}
      <div
        style={{
          height: 200,
          overflowY: "auto",
          background: "var(--bg-base)",
        }}
      >
        {activeTab === "params" && (
          <div style={{ padding: "10px 18px" }}>
            <KeyValueEditor
              items={request.params}
              onChange={(params) => updateTabRequest(tabId, { params })}
              keyPlaceholder="Key"
              valuePlaceholder="Value"
            />
          </div>
        )}
        {activeTab === "headers" && (
          <div style={{ padding: "10px 18px" }}>
            <HeadersEditor
              headers={request.headers}
              onHeadersChange={(headers) => updateTabRequest(tabId, { headers })}
            />
          </div>
        )}
        {activeTab === "body" && (
          <BodyEditor
            bodyType={request.bodyType}
            body={request.body}
            formData={request.formData}
            multipart={request.multipart}
            file={request.file}
            onBodyChange={(body) => updateTabRequest(tabId, { body })}
            onFormDataChange={(formData) => updateTabRequest(tabId, { formData })}
            onBodyTypeChange={(bodyType) => updateTabRequest(tabId, { bodyType })}
            onMultipartChange={(multipart) => updateTabRequest(tabId, { multipart })}
            onFileChange={(file) => updateTabRequest(tabId, { file })}
          />
        )}
        {activeTab === "auth" && (
          <div style={{ padding: "16px 18px" }}>
            <AuthEditor
              auth={request.auth}
              onAuthChange={(auth) => updateTabRequest(tabId, { auth })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
