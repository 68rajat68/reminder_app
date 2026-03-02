// contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export const ACCENT_COLORS = [
  { name: 'Blue', value: '#6366f1' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Indigo', value: '#4f46e5' },
] as const;

const PREFS_KEY = '@app_preferences';

interface ThemeContextType {
  mode: ThemeMode;
  accentColor: string;
  resolvedScheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  accentColor: ACCENT_COLORS[0].value,
  resolvedScheme: 'light',
  setMode: () => {},
  setAccentColor: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [accentColor, setAccentColorState] = useState(ACCENT_COLORS[0].value);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then(json => {
      if (json) {
        try {
          const prefs = JSON.parse(json);
          if (prefs.themeMode) setModeState(prefs.themeMode);
          if (prefs.accentColor) setAccentColorState(prefs.accentColor);
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const savePrefs = async (newMode: ThemeMode, newAccent: string) => {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify({
      themeMode: newMode,
      accentColor: newAccent,
    }));
  };

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    savePrefs(newMode, accentColor);
  };

  const setAccentColor = (color: string) => {
    setAccentColorState(color);
    savePrefs(mode, color);
  };

  const resolvedScheme: 'light' | 'dark' = mode === 'system'
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : mode;

  const value = useMemo(() => ({
    mode, accentColor, resolvedScheme, setMode, setAccentColor,
  }), [mode, accentColor, resolvedScheme]);

  if (!loaded) return null;

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
