export {
  allElements,
  appShellElements,
  collectionElements,
  commandPaletteElements,
  elementById,
  elementsByFeature,
  environmentElements,
  importExportElements,
  mcpElements,
  requestBuilderElements,
  responseViewerElements,
  settingsElements,
  sidebarElements,
  tabElements,
  workspaceElements,
} from "./elements/index.js";
export {
  allTestCases,
  appShellTestCases,
  collectionTestCases,
  commandPaletteTestCases,
  contentTypeTestCases,
  environmentTestCases,
  extraGapTestCases,
  featureCatalogs,
  getComingSoonTestCases,
  getCoverageSummary,
  getRestTestCases,
  getTestCasesForFeature,
  graphqlTestCases,
  historyDraftTestCases,
  importExportTestCases,
  keyboardTestCases,
  mcpTestCases,
  requestBuilderTestCases,
  responseExecutionTestCases,
  restDndShortcutEdgeCases,
  settingsPersistenceTestCases,
  sharedUiTestCases,
  sidebarTestCases,
  tabTestCases,
  testCaseById,
  testCasesByFeature,
  workspaceTestCases,
} from "./test-cases/index.js";
export type {
  AutomationStatus,
  FeatureCatalog,
  FeatureCode,
  TestAction,
  TestCase,
  TestCaseType,
  TestElement,
  TestPriority,
  TestScope,
  TestStep,
} from "./types.js";

import { elementById } from "./elements/index.js";
import type { TestCase, TestStep } from "./types.js";

/** Resolve a step's elementId to its Playwright selector. */
export function selectorForStep(step: TestStep): string | undefined {
  if (!step.elementId) return undefined;
  return elementById[step.elementId]?.selector;
}

/** Format a test case as a manual QA checklist line. */
export function formatManualChecklist(tc: TestCase): string {
  const steps = tc.steps
    .map((s) => {
      const el = s.elementId ? ` [${s.elementId}]` : "";
      return `  ${s.order}. ${s.action}${el}: ${s.expected}`;
    })
    .join("\n");
  return `${tc.id} — ${tc.title} (${tc.priority})\n${steps}\n→ ${tc.expectedResult}`;
}
