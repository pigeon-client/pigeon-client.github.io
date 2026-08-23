export type ArrowSide = "top" | "bottom" | "left" | "right";

export interface HeroDemoStep {
  id: string;
  label: string;
  ico: string;
  /** Short tip: where to look during this beat */
  help: string;
  /** Selector inside `.demo-app` for the focus target */
  target: string;
  /** Callout sits on this side of the target; arrow points back at it */
  arrow: ArrowSide;
  /** Elements that receive `.hl` for this step only */
  highlight: string[];
}

/** Ordered story beats for the hero demo — steps bar + pulse spotlight. */
export const HERO_DEMO_STEPS: HeroDemoStep[] = [
  {
    id: "launch",
    label: "Launch",
    ico: "⚡",
    help: "Watch the dock — Pigeon opens fast",
    target: "#demo-dock-icon",
    arrow: "top",
    highlight: ["#demo-dock-icon"],
  },
  {
    id: "new-tab",
    label: "New tab",
    ico: "📋",
    help: "Look here — tap + for a new request",
    target: "#demo-plus",
    arrow: "bottom",
    highlight: ["#demo-plus"],
  },
  {
    id: "auto-name",
    label: "Auto-name",
    ico: "✏️",
    help: "Tab name follows the URL path automatically",
    target: "#demo-tabname",
    arrow: "bottom",
    highlight: ["#demo-tabname", "#demo-method"],
  },
  {
    id: "send",
    label: "Send",
    ico: "🚀",
    help: "Hit Send — request fires instantly",
    target: "#demo-send",
    arrow: "left",
    highlight: ["#demo-send"],
  },
  {
    id: "response",
    label: "Response",
    ico: "✅",
    help: "Response lands here — status, time, body",
    target: "#demo-status",
    arrow: "bottom",
    highlight: ["#demo-status", "#demo-json"],
  },
  {
    id: "draft",
    label: "Draft saved",
    ico: "💾",
    help: "Auto-saved as a draft — no Save dialog",
    target: "#demo-draft-tab",
    arrow: "right",
    highlight: ["#demo-draft-tab", "#demo-draft-badge"],
  },
  {
    id: "filed",
    label: "Auto-filed",
    ico: "📁",
    help: "Filed by domain in the sidebar tree",
    target: "#demo-folder",
    arrow: "right",
    highlight: ["#demo-folder"],
  },
];

export const HERO_DEMO_STEP_COUNT = HERO_DEMO_STEPS.length;
