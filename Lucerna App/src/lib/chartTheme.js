import { useTheme } from "../context/ThemeContext";

// One source of truth for chart chrome colors in both themes.
// Replaces the per-file `theme === "dark" ? ... : ...` ternaries.
export function useChartTheme() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return {
    theme,
    gridColor: dark ? "rgba(255,255,255,0.06)" : "#e2e8f0",
    tickColor: dark ? "rgba(255,255,255,0.4)" : "#94a3b8",
    cursorFill: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
  };
}
