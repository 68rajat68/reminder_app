import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#1a1a2e",
    textSecondary: "#6b7280",
    textMuted: "#9ca3af",
    background: "#f8f9fc",
    surface: "#ffffff",
    surfacePressed: "#f3f4f6",
    primary: "#6366f1",
    primaryLight: "#818cf8",
    primaryDark: "#4f46e5",
    primaryBg: "#eef2ff",
    accent: "#8b5cf6",
    danger: "#ef4444",
    dangerBg: "#fef2f2",
    success: "#10b981",
    border: "#e5e7eb",
    borderLight: "#f3f4f6",
    shadow: "#000",
    tint: "#6366f1",
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: "#6366f1",
    toggleTrackOff: "#d1d5db",
    toggleTrackOn: "#6366f1",
    fab: "#6366f1",
    fabShadow: "rgba(99, 102, 241, 0.4)",
    cardGradientStart: "#6366f1",
    cardGradientEnd: "#8b5cf6",
    daySelected: "#6366f1",
    dayUnselected: "#f3f4f6",
    daySelectedText: "#ffffff",
    dayUnselectedText: "#6b7280",
  },
  dark: {
    text: "#f9fafb",
    textSecondary: "#9ca3af",
    textMuted: "#6b7280",
    background: "#0f0f1a",
    surface: "#1a1a2e",
    surfacePressed: "#252540",
    primary: "#818cf8",
    primaryLight: "#a5b4fc",
    primaryDark: "#6366f1",
    primaryBg: "#1e1b4b",
    accent: "#a78bfa",
    danger: "#f87171",
    dangerBg: "#451a1a",
    success: "#34d399",
    border: "#2d2d44",
    borderLight: "#1f1f35",
    shadow: "#000",
    tint: "#818cf8",
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: "#818cf8",
    toggleTrackOff: "#374151",
    toggleTrackOn: "#818cf8",
    fab: "#818cf8",
    fabShadow: "rgba(129, 140, 248, 0.4)",
    cardGradientStart: "#6366f1",
    cardGradientEnd: "#8b5cf6",
    daySelected: "#818cf8",
    dayUnselected: "#252540",
    daySelectedText: "#ffffff",
    dayUnselectedText: "#9ca3af",
  },
};

export type ThemeColors = typeof Colors.light;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  hero: 34,
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
});

export function useThemeColors(colorScheme: "light" | "dark" | null | undefined): ThemeColors {
  return Colors[colorScheme === "dark" ? "dark" : "light"];
}
