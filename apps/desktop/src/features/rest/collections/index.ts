export { CollectionsTab } from "./components/CollectionsTab";
export { FolderConfigModal, type FolderConfigModalState } from "./components/FolderConfigModal";
export { SaveToCollectionModal } from "./components/SaveToCollectionModal";
export { resolveInheritedRequest } from "./lib/inheritance";
export {
  buildUrlTree,
  collapseChains,
  countNode,
  countRequests,
  findAncestors,
  type InternalNode,
  mergeCollectionRoots,
  relabelLeaves,
  type UrlTreeReq,
} from "./lib/tree";
export { findNode, useCollectionStore } from "./store";
export type { Collection, CollectionNode, FolderConfig } from "./types";
export { MAX_NESTING_DEPTH } from "./types";
