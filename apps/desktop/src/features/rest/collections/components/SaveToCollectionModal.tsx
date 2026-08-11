import { Alert, Button, Input, Label, Modal, ModalFooter, ModalHeader, Select } from "@pigeon/ui";
import { useMemo, useState } from "react";
import type { RequestConfig } from "@/shared/types";
import { useCollectionStore } from "../store";
import type { CollectionNode } from "../types";

interface SaveToCollectionModalProps {
  request: RequestConfig;
  onClose: () => void;
  /** Called after a successful new save so the active tab can link to the node. */
  onSaved?: (origin: { collectionId: string; nodeId: string }) => void;
}

interface FolderOption {
  id: string | null;
  label: string;
}

function collectFolders(nodes: CollectionNode[], depth = 0): FolderOption[] {
  const folders: FolderOption[] = [];
  for (const node of nodes) {
    if (node.type !== "folder") continue;
    folders.push({ id: node.id, label: `${"  ".repeat(depth)}${node.name}` });
    folders.push(...collectFolders(node.children ?? [], depth + 1));
  }
  return folders;
}

export function SaveToCollectionModal({ request, onClose, onSaved }: SaveToCollectionModalProps) {
  const collections = useCollectionStore((s) => s.collections);
  const addRequest = useCollectionStore((s) => s.addRequest);
  const firstCollectionId = collections[0]?.id ?? "";
  const [collectionId, setCollectionId] = useState(firstCollectionId);
  const [folderId, setFolderId] = useState<string>("__root__");
  const initialName = request.name || request.url || "Untitled Request";
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");

  const selectedCollection = collections.find((collection) => collection.id === collectionId);
  const folders = useMemo<FolderOption[]>(() => {
    if (!selectedCollection) return [{ id: null, label: "Root" }];
    return [{ id: null, label: "Root" }, ...collectFolders(selectedCollection.root)];
  }, [selectedCollection]);

  const canSave = Boolean(collectionId && name.trim() && request.url.trim());

  const handleSave = async () => {
    if (!canSave) return;
    setError("");
    try {
      // Renaming here counts as a manual name → lock it so the path never overrides it.
      const edited = name.trim() !== initialName;
      const savedRequest: RequestConfig = {
        ...request,
        name: name.trim(),
        nameLocked: edited ? true : (request.nameLocked ?? false),
      };
      const nodeId = await addRequest(
        collectionId,
        folderId === "__root__" ? null : folderId,
        name.trim(),
        savedRequest,
      );
      if (!nodeId) {
        setError("Could not save request to that folder.");
        return;
      }
      onSaved?.({ collectionId, nodeId });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Modal onClose={onClose} width={460}>
      <ModalHeader title="Save to Collection" onClose={onClose} />
      <div className="flex flex-col gap-4 px-5 py-5">
        {collections.length === 0 ? (
          <Alert>Create a collection first, then save this request.</Alert>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="save-collection" variant="field" className="mb-0">
                Collection
              </Label>
              <Select
                id="save-collection"
                size="lg"
                value={collectionId}
                onChange={(e) => {
                  setCollectionId(e.target.value);
                  setFolderId("__root__");
                }}
              >
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="save-folder" variant="field" className="mb-0">
                Folder
              </Label>
              <Select
                id="save-folder"
                size="lg"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
              >
                {folders.map((folder) => (
                  <option key={folder.id ?? "__root__"} value={folder.id ?? "__root__"}>
                    {folder.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="save-request-name" variant="field" className="mb-0">
                Request Name
              </Label>
              <Input
                id="save-request-name"
                size="lg"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") onClose();
                }}
              />
            </div>
          </>
        )}

        {error ? (
          <Alert variant="destructive" role="alert">
            {error}
          </Alert>
        ) : null}
      </div>
      <ModalFooter>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={!canSave}>
          Save
        </Button>
      </ModalFooter>
    </Modal>
  );
}
