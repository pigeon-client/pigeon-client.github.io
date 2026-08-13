import type {
  AutomationStatus,
  FeatureCatalog,
  FeatureCode,
  TestCase,
  TestScope,
} from "../types.js";
import {
  appShellTestCases,
  sidebarTestCases,
  workspaceTestCases,
} from "./app-workspace-sidebar.js";
import {
  commandPaletteTestCases,
  contentTypeTestCases,
  environmentTestCases,
  graphqlTestCases,
  importExportTestCases,
  keyboardTestCases,
  mcpTestCases,
  settingsPersistenceTestCases,
  sharedUiTestCases,
} from "./features-crosscutting.js";
import { extraGapTestCases } from "./gaps-and-edge.js";
import {
  collectionTestCases,
  historyDraftTestCases,
  responseExecutionTestCases,
} from "./response-collections-history.js";
import { restDndShortcutEdgeCases } from "./rest-dnd-shortcuts.js";
import { requestBuilderTestCases, tabTestCases } from "./tabs-request-builder.js";

/** MCP, GraphQL, and workbench-swap cases are catalogued but out of the current REST QA pass. */
const COMING_SOON_FEATURES: ReadonlySet<FeatureCode> = new Set(["MCP", "GQL", "WS"]);

function withDefaultScope(tc: TestCase): TestCase {
  if (tc.scope) return tc;
  if (COMING_SOON_FEATURES.has(tc.feature)) {
    return { ...tc, scope: "coming-soon" };
  }
  return { ...tc, scope: "rest" };
}

export const allTestCases: TestCase[] = [
  ...appShellTestCases,
  ...workspaceTestCases,
  ...sidebarTestCases,
  ...tabTestCases,
  ...requestBuilderTestCases,
  ...responseExecutionTestCases,
  ...collectionTestCases,
  ...historyDraftTestCases,
  ...environmentTestCases,
  ...importExportTestCases,
  ...commandPaletteTestCases,
  ...settingsPersistenceTestCases,
  ...contentTypeTestCases,
  ...keyboardTestCases,
  ...sharedUiTestCases,
  ...mcpTestCases,
  ...graphqlTestCases,
  ...extraGapTestCases,
  ...restDndShortcutEdgeCases,
].map(withDefaultScope);

export const testCaseById = Object.fromEntries(allTestCases.map((tc) => [tc.id, tc])) as Record<
  string,
  TestCase
>;

export const testCasesByFeature = allTestCases.reduce<Record<string, TestCase[]>>((acc, tc) => {
  if (!acc[tc.feature]) {
    acc[tc.feature] = [];
  }
  acc[tc.feature].push(tc);
  return acc;
}, {});

/** Feature metadata + grouped test cases for QA dashboards and exports. */
function cases(code: FeatureCode): TestCase[] {
  return testCasesByFeature[code] ?? [];
}

export const featureCatalogs: FeatureCatalog[] = [
  {
    code: "APP",
    name: "Application Shell",
    docPath: "docs/features/app-shell.md",
    status: "shipped",
    elements: [],
    testCases: cases("APP"),
  },
  {
    code: "WS",
    name: "Workspaces",
    docPath: "docs/features/workspaces.md",
    status: "shipped",
    elements: [],
    testCases: cases("WS"),
  },
  {
    code: "SID",
    name: "Sidebar",
    docPath: "docs/features/sidebar.md",
    status: "shipped",
    elements: [],
    testCases: cases("SID"),
  },
  {
    code: "TAB",
    name: "Request Tabs",
    docPath: "docs/features/tabs.md",
    status: "shipped",
    elements: [],
    testCases: cases("TAB"),
  },
  {
    code: "RB",
    name: "Request Builder",
    docPath: "docs/features/request-builder.md",
    status: "shipped",
    elements: [],
    testCases: cases("RB"),
  },
  {
    code: "RV",
    name: "Response Viewer",
    docPath: "docs/features/response-viewer.md",
    status: "shipped",
    elements: [],
    testCases: cases("RV"),
  },
  {
    code: "EX",
    name: "Execution",
    docPath: "docs/features/execution.md",
    status: "shipped",
    elements: [],
    testCases: cases("EX"),
  },
  {
    code: "COL",
    name: "Collections",
    docPath: "docs/features/collections.md",
    status: "shipped",
    elements: [],
    testCases: cases("COL"),
  },
  {
    code: "HD",
    name: "History & Drafts",
    docPath: "docs/features/history-drafts.md",
    status: "shipped",
    elements: [],
    testCases: cases("HD"),
  },
  {
    code: "ENV",
    name: "Environments",
    docPath: "docs/features/environments.md",
    status: "shipped",
    elements: [],
    testCases: cases("ENV"),
  },
  {
    code: "IE",
    name: "Import / Export",
    docPath: "docs/features/import-export.md",
    status: "shipped",
    elements: [],
    testCases: cases("IE"),
  },
  {
    code: "CP",
    name: "Command Palette",
    docPath: "docs/features/command-palette.md",
    status: "shipped",
    elements: [],
    testCases: cases("CP"),
  },
  {
    code: "SET",
    name: "Settings",
    docPath: "docs/features/settings.md",
    status: "shipped",
    elements: [],
    testCases: cases("SET"),
  },
  {
    code: "PER",
    name: "Persistence",
    docPath: "docs/features/persistence.md",
    status: "shipped",
    elements: [],
    testCases: cases("PER"),
  },
  {
    code: "CT",
    name: "Content Types",
    docPath: "docs/features/content-types.md",
    status: "shipped",
    elements: [],
    testCases: cases("CT"),
  },
  {
    code: "KB",
    name: "Keyboard Shortcuts",
    docPath: "docs/features/keyboard-shortcuts.md",
    status: "shipped",
    elements: [],
    testCases: cases("KB"),
  },
  {
    code: "SUI",
    name: "Shared UI",
    docPath: "docs/features/shared-ui.md",
    status: "shipped",
    elements: [],
    testCases: cases("SUI"),
  },
  {
    code: "MCP",
    name: "MCP Workspace",
    docPath: "docs/features/mcp.md",
    status: "coming-soon",
    elements: [],
    testCases: cases("MCP"),
  },
  {
    code: "GQL",
    name: "GraphQL Workspace",
    docPath: "docs/features/graphql.md",
    status: "coming-soon",
    elements: [],
    testCases: cases("GQL"),
  },
];

export function getTestCasesForFeature(code: FeatureCode): TestCase[] {
  return testCasesByFeature[code] ?? [];
}

/** REST product cases only — excludes MCP, GraphQL, and coming-soon workbench swaps. */
export function getRestTestCases(): TestCase[] {
  return allTestCases.filter((tc) => (tc.scope ?? "rest") === "rest");
}

export function getComingSoonTestCases(): TestCase[] {
  return allTestCases.filter((tc) => tc.scope === "coming-soon");
}

export function getCoverageSummary(opts?: { scope?: TestScope | "all" }): {
  total: number;
  byStatus: Record<AutomationStatus, number>;
  byPriority: Record<string, number>;
  restTotal: number;
  comingSoonTotal: number;
} {
  const byStatus: Record<AutomationStatus, number> = {
    covered: 0,
    partial: 0,
    missing: 0,
    "manual-only": 0,
  };
  const byPriority = { P0: 0, P1: 0, P2: 0 } as Record<string, number>;
  const restTotal = getRestTestCases().length;
  const comingSoonTotal = getComingSoonTestCases().length;
  const pool =
    opts?.scope === "rest"
      ? getRestTestCases()
      : opts?.scope === "coming-soon"
        ? getComingSoonTestCases()
        : allTestCases;

  for (const tc of pool) {
    byStatus[tc.automation.status]++;
    byPriority[tc.priority]++;
  }

  return { total: pool.length, byStatus, byPriority, restTotal, comingSoonTotal };
}

export {
  appShellTestCases,
  collectionTestCases,
  commandPaletteTestCases,
  contentTypeTestCases,
  environmentTestCases,
  extraGapTestCases,
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
  workspaceTestCases,
};
