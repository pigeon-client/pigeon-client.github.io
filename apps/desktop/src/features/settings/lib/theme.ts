export type AppTheme = "dark" | "light";

const THEME_KEY = "pg_theme";

/** The persisted theme, defaulting to dark. Owns the storage key. */
export function getStoredTheme(): AppTheme {
  return (localStorage.getItem(THEME_KEY) as AppTheme) ?? "dark";
}

export function applyTheme(theme: AppTheme) {
  const html = document.documentElement;
  html.classList.remove("dark", "theme-light");
  if (theme === "dark") html.classList.add("dark");
  if (theme === "light") html.classList.remove("dark");
  localStorage.setItem(THEME_KEY, theme);
}
