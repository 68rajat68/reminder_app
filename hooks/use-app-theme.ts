// hooks/use-app-theme.ts
import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getColors, ThemeColors } from '../constants/theme';

export function useAppTheme(): ThemeColors {
  const { resolvedScheme, accentColor } = useTheme();
  return useMemo(() => getColors(resolvedScheme, accentColor), [resolvedScheme, accentColor]);
}
