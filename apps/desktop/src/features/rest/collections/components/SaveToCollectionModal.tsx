import { Button } from "@pigeon/ui";
import { useMemo, useState } from "react";
import type { RequestConfig } from "@/shared/types";
import { Modal, ModalFooter, ModalHeader } from "@/shared/ui/Modal";
import { useCollectionStore } from "../store";
import type { CollectionNode } from "../types";

interface SaveToCollectionModalProps {
  request: RequestConfig;
  onClose: () => void;
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

export function SaveToCollectionModal({ request, onClose }: SaveToCollectionModalProps) {
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
      const ok = await addRequest(
        collectionId,
        folderId === "__root__" ? null : folderId,
        name.trim(),
        savedRequest,
      );
      if (!ok) {
        setError("Could not save request to that folder.");
        return;
      }
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
          <div className="rounded border border-border bg-background/40 px-3 py-3 text-xs text-muted-foreground">
            Create a collection first, then save this request.
          </div>
        ) : (
          <>
            <label className="flex flex-col gap-2">
              <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                Collection
              </span>
              <select
                value={collectionId}
                onChange={(e) => {
                  setCollectionId(e.target.value);
                  setFolderId("__root__");
                }}
                className="h-9 w-full rounded border border-border bg-card px-3 font-mono text-xs text-foreground outline-none focus:border-primary"
              >
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                Folder
              </span>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="h-9 w-full rounded border border-border bg-card px-3 font-mono text-xs text-foreground outline-none focus:border-primary"
              >
                {folders.map((folder) => (
                  <option key={folder.id ?? "__root__"} value={folder.id ?? "__root__"}>
                    {folder.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
                Request Name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") onClose();
                }}
                className="h-9 w-full rounded border border-border bg-card px-3 font-mono text-xs text-foreground outline-none focus:border-primary"
              />
            </label>
          </>
        )}

        {error && (
          <div className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
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
