export { KeyboardShortcutsModal } from "./components/KeyboardShortcutsModal";
export { SettingsDrawer } from "./components/SettingsDrawer";
export { useWordWrap } from "./hooks/useWordWrap";
export { getMigrationStatus, type MigrationStatus } from "./lib/migration";
export { type AppTheme, applyTheme, getStoredTheme } from "./lib/theme";
export {
  checkForUpdates,
  checkUpdateVersion,
  getCachedUpdateResult,
  getCurrentVersion,
  installUpdate,
  onUpdateCacheChange,
  type UpdateCheckResult,
  type UpdateCheckStatus,
  type UpdateVersionModel,
} from "./lib/updater";
export {
  getWordWrap,
  setWordWrap,
  subscribeWordWrap,
} from "./lib/wordWrap";
