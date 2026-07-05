export type AppTheme = "dark" | "light";

export function applyTheme(theme: AppTheme) {
  const html = document.documentElement;
  html.classList.remove("dark", "theme-light");
  if (theme === "dark") html.classList.add("dark");
  if (theme === "light") html.classList.remove("dark");
  localStorage.setItem("pg_theme", theme);
}
