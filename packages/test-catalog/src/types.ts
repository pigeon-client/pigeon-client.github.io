/** Feature area codes used in TC-* and EL-* IDs. */
export type FeatureCode =
  | "APP"
  | "WS"
  | "TAB"
  | "SID"
  | "KB"
  | "RB"
  | "CT"
  | "EX"
  | "RV"
  | "COL"
  | "HD"
  | "IE"
  | "ENV"
  | "CP"
  | "SET"
  | "PER"
  | "SUI"
  | "MCP"
  | "GQL"
  | "UI";

export type TestCaseType =
  | "functional"
  | "crud"
  | "ui"
  | "ux"
  | "keyboard"
  | "edge"
  | "accessibility"
  | "persistence";

export type TestPriority = "P0" | "P1" | "P2";

/** REST is the shipped product. Coming-soon workbenches are excluded from REST QA. */
export type TestScope = "rest" | "coming-soon";

export type AutomationStatus = "covered" | "partial" | "missing" | "manual-only";

export type TestAction =
  | "navigate"
  | "click"
  | "dblclick"
  | "hover"
  | "type"
  | "fill"
  | "clear"
  | "select"
  | "check"
  | "uncheck"
  | "keyboard"
  | "drag"
  | "drop"
  | "scroll"
  | "wait"
  | "verify"
  | "reload";

/** Selectable UI element registered for test automation and manual QA. */
export interface TestElement {
  /** Stable catalog ID, e.g. EL-RB-001 */
  id: string;
  feature: FeatureCode;
  /** Human label shown in test steps */
  name: string;
  /** Primary Playwright locator (prefer data-testid) */
  selector: string;
  /** Underlying data-testid when present */
  testId?: string;
  /** Element id attribute when used instead of testid */
  elementId?: string;
  /** aria role hint for manual testers */
  role?: string;
  /** Component / file that renders this element */
  component?: string;
  /** True when selector is documented but not yet implemented in UI */
  planned?: boolean;
  notes?: string;
}

/** One executable step inside a test case. */
export interface TestStep {
  order: number;
  action: TestAction;
  /** Reference to TestElement.id */
  elementId?: string;
  /** Keyboard chord, URL, or free-text input */
  input?: string;
  /** What the tester should observe after this step */
  expected: string;
}

/** Full test case definition for manual or automated QA. */
export interface TestCase {
  /** Stable catalog ID, e.g. TC-RB-001 */
  id: string;
  feature: FeatureCode;
  /** Feature doc slug under docs/features/ */
  featureDoc: string;
  title: string;
  type: TestCaseType;
  priority: TestPriority;
  /** Default `rest`. Coming-soon MCP/GraphQL cases are out of the current REST QA pass. */
  scope?: TestScope;
  /** Preconditions before step 1 */
  preconditions: string[];
  steps: TestStep[];
  /** Final pass/fail criteria */
  expectedResult: string;
  /** Related TestElement IDs touched in this case */
  elementIds: string[];
  automation: {
    status: AutomationStatus;
    /** Vitest or Playwright spec path relative to apps/desktop */
    spec?: string;
    /** Test name inside the spec when covered */
    testName?: string;
  };
  tags: string[];
}

export interface FeatureCatalog {
  code: FeatureCode;
  name: string;
  docPath: string;
  status: "shipped" | "coming-soon" | "retained";
  elements: TestElement[];
  testCases: TestCase[];
}
