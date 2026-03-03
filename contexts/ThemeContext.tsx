// contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themeLog } from '../services/logger';

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
  const [accentColor, setAccentColorState] = useState<string>(ACCENT_COLORS[0].value);
  const [loaded, setLoaded] = useState(false);

  // Fix #4: Use refs to always have current values, preventing stale closure race
  const modeRef = useRef(mode);
  const accentRef = useRef(accentColor);
  modeRef.current = mode;
  accentRef.current = accentColor;

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then(json => {
      if (json) {
        try {
          const prefs = JSON.parse(json);
          if (prefs.themeMode) {
            setModeState(prefs.themeMode);
            modeRef.current = prefs.themeMode;
          }
          if (prefs.accentColor) {
            setAccentColorState(prefs.accentColor);
            accentRef.current = prefs.accentColor;
          }
          themeLog.loaded(prefs.themeMode || 'system', prefs.accentColor || ACCENT_COLORS[0].value);
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const savePrefs = useCallback(async (newMode: ThemeMode, newAccent: string) => {
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify({
        themeMode: newMode,
        accentColor: newAccent,
      }));
      themeLog.persisted(newMode, newAccent);
    } catch (e) {
      themeLog.error(e);
    }
  }, []);

  // Fix #13: Wrap in useCallback for stable references + use refs for current values
  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    modeRef.current = newMode;
    themeLog.changed('mode', newMode);
    savePrefs(newMode, accentRef.current);
  }, [savePrefs]);

  const setAccentColor = useCallback((color: string) => {
    setAccentColorState(color);
    accentRef.current = color;
    themeLog.changed('accentColor', color);
    savePrefs(modeRef.current, color);
  }, [savePrefs]);

  const resolvedScheme: 'light' | 'dark' = mode === 'system'
    ? (systemScheme === 'dark' ? 'dark' : 'light')
    : mode;

  const value = useMemo(() => ({
    mode, accentColor, resolvedScheme, setMode, setAccentColor,
  }), [mode, accentColor, resolvedScheme, setMode, setAccentColor]);

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
