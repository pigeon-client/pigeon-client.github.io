import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@pigeon/ui";
import { useState } from "react";
import { VarKeyValueEditor } from "@/features/environments";
import type { AuthConfig, Header } from "@/shared/types";
import { AuthEditor } from "@/shared/ui/AuthEditor";
import { Modal, ModalFooter, ModalHeader } from "@/shared/ui/Modal";
import type { FolderConfig } from "../types";

const BLANK_AUTH: AuthConfig = {
  type: "none",
  username: "",
  password: "",
  token: "",
  apiKey: "",
  apiValue: "",
  apiAddTo: "header",
};

export interface FolderConfigModalState {
  folderName: string;
  config: FolderConfig;
  onSubmit: (config: FolderConfig) => void;
}

function withBlankRow(headers: Header[]): Header[] {
  const last = headers[headers.length - 1];
  return !last || last.key || last.value
    ? [...headers, { key: "", value: "", enabled: true }]
    : headers;
}

export function FolderConfigModal({
  state,
  onClose,
}: {
  state: FolderConfigModalState;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"headers" | "auth">("headers");
  const [headers, setHeaders] = useState<Header[]>(withBlankRow(state.config.headers ?? []));
  const [auth, setAuth] = useState<AuthConfig>(state.config.auth ?? BLANK_AUTH);

  const commit = () => {
    const cleaned = headers.filter((h) => h.key.trim());
    state.onSubmit({
      headers: cleaned.length > 0 ? cleaned : undefined,
      auth: auth.type !== "none" ? auth : undefined,
    });
    onClose();
  };

  return (
    <Modal onClose={onClose} width={520}>
      <ModalHeader title={`"${state.folderName}" headers & auth`} onClose={onClose} />
      <p className="px-5 pt-4 text-2xs text-muted-foreground">
        Inherited by every request in this folder (and its subfolders). A request's own headers or
        auth always take priority over what's set here.
      </p>
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "headers" | "auth")}
        className="flex min-h-[280px] flex-col px-5 pt-2"
      >
        <TabsList variant="underline" className="w-full shrink-0 justify-start">
          <TabsTrigger variant="underline" value="headers" data-testid="folder-config-tab-headers">
            Headers
          </TabsTrigger>
          <TabsTrigger variant="underline" value="auth" data-testid="folder-config-tab-auth">
            Auth
          </TabsTrigger>
        </TabsList>
        <TabsContent value="headers" className="m-0 flex-1 overflow-auto py-3">
          <VarKeyValueEditor
            items={headers}
            onChange={(items) => setHeaders(withBlankRow(items as Header[]))}
            keyPlaceholder="Header"
            valuePlaceholder="Value"
            testId="folder-header"
            addLabel="Add header"
          />
        </TabsContent>
        <TabsContent value="auth" className="m-0 flex-1 overflow-auto py-3">
          <AuthEditor auth={auth} onAuthChange={setAuth} subject="This folder" />
        </TabsContent>
      </Tabs>
      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={commit}>
          Save
        </Button>
      </ModalFooter>
    </Modal>
  );
}
