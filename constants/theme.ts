// constants/theme.ts
import { Platform } from 'react-native';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 99, g: 102, b: 241 };
}

function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const lr = Math.min(255, Math.round(r + (255 - r) * amount));
  const lg = Math.min(255, Math.round(g + (255 - g) * amount));
  const lb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `rgb(${lr}, ${lg}, ${lb})`;
}

function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r * (1 - amount))}, ${Math.round(g * (1 - amount))}, ${Math.round(b * (1 - amount))})`;
}

export function getColors(scheme: 'light' | 'dark', accent: string) {
  const { r, g, b } = hexToRgb(accent);

  if (scheme === 'light') {
    return {
      text: '#1a1a2e',
      textSecondary: '#6b7280',
      textMuted: '#9ca3af',
      background: '#f8f9fc',
      surface: '#ffffff',
      surfacePressed: '#f3f4f6',
      primary: accent,
      primaryLight: lighten(accent, 0.3),
      primaryDark: darken(accent, 0.15),
      primaryBg: `rgba(${r}, ${g}, ${b}, 0.08)`,
      accent: lighten(accent, 0.15),
      danger: '#ef4444',
      dangerBg: '#fef2f2',
      success: '#10b981',
      border: '#e5e7eb',
      borderLight: '#f3f4f6',
      shadow: '#000',
      tint: accent,
      icon: '#687076',
      tabIconDefault: '#687076',
      tabIconSelected: accent,
      toggleTrackOff: '#d1d5db',
      toggleTrackOn: accent,
      fab: accent,
      fabShadow: `rgba(${r}, ${g}, ${b}, 0.4)`,
      cardGradientStart: accent,
      cardGradientEnd: lighten(accent, 0.15),
      daySelected: accent,
      dayUnselected: '#f3f4f6',
      daySelectedText: '#ffffff',
      dayUnselectedText: '#6b7280',
      progressRingBg: '#e5e7eb',
      streakFire: '#f59e0b',
    };
  }

  // dark
  const lightAccent = lighten(accent, 0.3);
  return {
    text: '#f9fafb',
    textSecondary: '#9ca3af',
    textMuted: '#6b7280',
    background: '#0f0f1a',
    surface: '#1a1a2e',
    surfacePressed: '#252540',
    primary: lightAccent,
    primaryLight: lighten(accent, 0.45),
    primaryDark: accent,
    primaryBg: `rgba(${r}, ${g}, ${b}, 0.15)`,
    accent: lighten(accent, 0.25),
    danger: '#f87171',
    dangerBg: '#451a1a',
    success: '#34d399',
    border: '#2d2d44',
    borderLight: '#1f1f35',
    shadow: '#000',
    tint: lightAccent,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: lightAccent,
    toggleTrackOff: '#374151',
    toggleTrackOn: lightAccent,
    fab: lightAccent,
    fabShadow: `rgba(${r}, ${g}, ${b}, 0.4)`,
    cardGradientStart: accent,
    cardGradientEnd: lighten(accent, 0.15),
    daySelected: lightAccent,
    dayUnselected: '#252540',
    daySelectedText: '#ffffff',
    dayUnselectedText: '#9ca3af',
    progressRingBg: '#2d2d44',
    streakFire: '#fbbf24',
  };
}

export type ThemeColors = ReturnType<typeof getColors>;

// Keep backward compat — existing code uses useThemeColors(colorScheme)
// This will be gradually replaced by the context-based hook
export function useThemeColors(colorScheme: 'light' | 'dark' | null | undefined): ThemeColors {
  const defaultAccent = '#6366f1';
  return getColors(colorScheme === 'dark' ? 'dark' : 'light', defaultAccent);
}

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
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
});
