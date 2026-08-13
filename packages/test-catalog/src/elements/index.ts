import type { TestElement } from "../types.js";
import { appShellElements, sidebarElements, workspaceElements } from "./app-sidebar.js";
import {
  collectionElements,
  commandPaletteElements,
  environmentElements,
  importExportElements,
  mcpElements,
  responseViewerElements,
  settingsElements,
} from "./features.js";
import { requestBuilderElements, tabElements } from "./request-tabs.js";

export const allElements: TestElement[] = [
  ...appShellElements,
  ...workspaceElements,
  ...sidebarElements,
  ...tabElements,
  ...requestBuilderElements,
  ...responseViewerElements,
  ...collectionElements,
  ...environmentElements,
  ...importExportElements,
  ...commandPaletteElements,
  ...settingsElements,
  ...mcpElements,
];

export const elementById = Object.fromEntries(allElements.map((el) => [el.id, el])) as Record<
  string,
  TestElement
>;

export const elementsByFeature = allElements.reduce<Record<string, TestElement[]>>((acc, el) => {
  if (!acc[el.feature]) {
    acc[el.feature] = [];
  }
  acc[el.feature].push(el);
  return acc;
}, {});

export {
  appShellElements,
  collectionElements,
  commandPaletteElements,
  environmentElements,
  importExportElements,
  mcpElements,
  requestBuilderElements,
  responseViewerElements,
  settingsElements,
  sidebarElements,
  tabElements,
  workspaceElements,
};
