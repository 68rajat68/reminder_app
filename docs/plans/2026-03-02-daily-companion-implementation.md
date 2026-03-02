# Daily Companion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Daily Reminders app into a habit tracking companion with streaks, progress visualization, theming, and engagement mechanics.

**Architecture:** Migrate from AsyncStorage to expo-sqlite for habit + completion data. Add ThemeContext for light/dark/system mode with user-selectable accent color. Restructure navigation from Stack-only to bottom tabs (Today/Stats/Settings) with Stack modals. Add streak calculation, progress ring (SVG), stats charts, and celebration animations.

**Tech Stack:** Expo SDK 54, React Native 0.81, expo-sqlite, react-native-svg, expo-router (file-based tabs), react-native-reanimated, expo-notifications

---

## Phase 1: Foundation — Types, Database, Migration

### Task 1: Install new dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install expo-sqlite and react-native-svg**

```bash
npx expo install expo-sqlite react-native-svg
```

**Step 2: Verify installation**

```bash
npx expo-doctor
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add expo-sqlite and react-native-svg dependencies"
```

---

### Task 2: Create Habit type and category definitions

**Files:**
- Create: `types/habit.ts`

**Step 1: Create the new type file**

```typescript
// types/habit.ts
export type CategoryType = 'health' | 'work' | 'personal' | 'fitness' | 'learning' | 'other';

export interface Habit {
  id: string;
  message: string;
  hour: number;       // 0-23
  minute: number;     // 0-59
  days: number[];     // 1=Sunday..7=Saturday (expo weekday format)
  enabled: boolean;
  notificationIds: string[];
  createdAt: number;
  category: CategoryType;
  icon: string;       // emoji
  streak: number;
  bestStreak: number;
}

export interface Completion {
  habitId: string;
  date: string;       // "YYYY-MM-DD"
  completed: boolean;
}

export const CATEGORIES: { type: CategoryType; label: string; defaultIcon: string }[] = [
  { type: 'health', label: 'Health', defaultIcon: '💊' },
  { type: 'fitness', label: 'Fitness', defaultIcon: '🏃' },
  { type: 'work', label: 'Work', defaultIcon: '💼' },
  { type: 'personal', label: 'Personal', defaultIcon: '🌟' },
  { type: 'learning', label: 'Learning', defaultIcon: '📚' },
  { type: 'other', label: 'Other', defaultIcon: '📌' },
];

export const CATEGORY_ICONS: Record<CategoryType, string[]> = {
  health:   ['💊', '💧', '🧘', '😴', '🍎', '🩺', '💉', '🫁'],
  fitness:  ['🏃', '🏋️', '🚴', '🧗', '⚽', '🏊', '🤸', '🚶'],
  work:     ['💼', '💻', '📧', '📊', '📝', '🗂️', '📞', '🎯'],
  personal: ['🌟', '🧹', '🛒', '👨‍👩‍👧', '🐕', '🪴', '📖', '✍️'],
  learning: ['📚', '🎓', '🧠', '📐', '🔬', '🎨', '🎵', '🌍'],
  other:    ['📌', '⏰', '🔔', '📋', '🗓️', '✅', '🎒', '🏠'],
};
```

**Step 2: Commit**

```bash
git add types/habit.ts
git commit -m "feat: add Habit type, categories, and icon definitions"
```

---

### Task 3: Create SQLite database service

**Files:**
- Create: `services/database.ts`

**Step 1: Create the database service**

```typescript
// services/database.ts
import * as SQLite from 'expo-sqlite';
import { Habit, Completion, CategoryType } from '../types/habit';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('dailycompanion.db');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY,
        message TEXT NOT NULL,
        hour INTEGER NOT NULL,
        minute INTEGER NOT NULL,
        days TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        notificationIds TEXT NOT NULL DEFAULT '[]',
        category TEXT NOT NULL DEFAULT 'other',
        icon TEXT NOT NULL DEFAULT '📌',
        streak INTEGER NOT NULL DEFAULT 0,
        bestStreak INTEGER NOT NULL DEFAULT 0,
        createdAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        habitId TEXT NOT NULL,
        date TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 1,
        UNIQUE(habitId, date),
        FOREIGN KEY(habitId) REFERENCES habits(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_completions_date ON completions(date);
      CREATE INDEX IF NOT EXISTS idx_completions_habit ON completions(habitId);
    `);
  }
  return db;
}

// --- Habit CRUD ---

export async function getAllHabits(): Promise<Habit[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: string; message: string; hour: number; minute: number;
    days: string; enabled: number; notificationIds: string;
    category: string; icon: string; streak: number; bestStreak: number;
    createdAt: number;
  }>('SELECT * FROM habits ORDER BY hour ASC, minute ASC');

  return rows.map(row => ({
    id: row.id,
    message: row.message,
    hour: row.hour,
    minute: row.minute,
    days: JSON.parse(row.days),
    enabled: row.enabled === 1,
    notificationIds: JSON.parse(row.notificationIds),
    category: row.category as CategoryType,
    icon: row.icon,
    streak: row.streak,
    bestStreak: row.bestStreak,
    createdAt: row.createdAt,
  }));
}

export async function getHabitById(id: string): Promise<Habit | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    id: string; message: string; hour: number; minute: number;
    days: string; enabled: number; notificationIds: string;
    category: string; icon: string; streak: number; bestStreak: number;
    createdAt: number;
  }>('SELECT * FROM habits WHERE id = ?', [id]);

  if (!row) return null;
  return {
    id: row.id,
    message: row.message,
    hour: row.hour,
    minute: row.minute,
    days: JSON.parse(row.days),
    enabled: row.enabled === 1,
    notificationIds: JSON.parse(row.notificationIds),
    category: row.category as CategoryType,
    icon: row.icon,
    streak: row.streak,
    bestStreak: row.bestStreak,
    createdAt: row.createdAt,
  };
}

export async function insertHabit(habit: Habit): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO habits (id, message, hour, minute, days, enabled, notificationIds, category, icon, streak, bestStreak, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [habit.id, habit.message, habit.hour, habit.minute,
     JSON.stringify(habit.days), habit.enabled ? 1 : 0,
     JSON.stringify(habit.notificationIds), habit.category,
     habit.icon, habit.streak, habit.bestStreak, habit.createdAt]
  );
}

export async function updateHabit(habit: Habit): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `UPDATE habits SET message=?, hour=?, minute=?, days=?, enabled=?, notificationIds=?, category=?, icon=?, streak=?, bestStreak=?, createdAt=?
     WHERE id=?`,
    [habit.message, habit.hour, habit.minute,
     JSON.stringify(habit.days), habit.enabled ? 1 : 0,
     JSON.stringify(habit.notificationIds), habit.category,
     habit.icon, habit.streak, habit.bestStreak, habit.createdAt,
     habit.id]
  );
}

export async function deleteHabit(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM habits WHERE id = ?', [id]);
}

// --- Completions ---

export async function getCompletionsForDate(date: string): Promise<Completion[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ habitId: string; date: string; completed: number }>(
    'SELECT habitId, date, completed FROM completions WHERE date = ?', [date]
  );
  return rows.map(r => ({ habitId: r.habitId, date: r.date, completed: r.completed === 1 }));
}

export async function getCompletionsForHabit(habitId: string): Promise<Completion[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ habitId: string; date: string; completed: number }>(
    'SELECT habitId, date, completed FROM completions WHERE habitId = ? ORDER BY date DESC', [habitId]
  );
  return rows.map(r => ({ habitId: r.habitId, date: r.date, completed: r.completed === 1 }));
}

export async function getCompletionsInRange(startDate: string, endDate: string): Promise<Completion[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ habitId: string; date: string; completed: number }>(
    'SELECT habitId, date, completed FROM completions WHERE date >= ? AND date <= ? ORDER BY date', [startDate, endDate]
  );
  return rows.map(r => ({ habitId: r.habitId, date: r.date, completed: r.completed === 1 }));
}

export async function toggleCompletion(habitId: string, date: string, completed: boolean): Promise<void> {
  const database = await getDatabase();
  if (completed) {
    await database.runAsync(
      'INSERT OR REPLACE INTO completions (habitId, date, completed) VALUES (?, ?, 1)',
      [habitId, date]
    );
  } else {
    await database.runAsync(
      'DELETE FROM completions WHERE habitId = ? AND date = ?',
      [habitId, date]
    );
  }
}
```

**Step 2: Commit**

```bash
git add services/database.ts
git commit -m "feat: add SQLite database service with habit and completion CRUD"
```

---

### Task 4: Create migration service (AsyncStorage → SQLite)

**Files:**
- Create: `services/migration.ts`

**Step 1: Create migration service**

```typescript
// services/migration.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { insertHabit, getDatabase } from './database';
import { Habit } from '../types/habit';

const STORAGE_KEY = '@daily_reminders';
const MIGRATION_FLAG = '@migration_completed_v2';

interface LegacyReminder {
  id: string;
  message: string;
  hour: number;
  minute: number;
  days: number[];
  enabled: boolean;
  notificationIds: string[];
  createdAt: number;
}

export async function migrateIfNeeded(): Promise<void> {
  const migrated = await AsyncStorage.getItem(MIGRATION_FLAG);
  if (migrated === 'true') return;

  const json = await AsyncStorage.getItem(STORAGE_KEY);
  if (!json) {
    // No legacy data — mark as migrated
    await AsyncStorage.setItem(MIGRATION_FLAG, 'true');
    return;
  }

  try {
    const reminders: LegacyReminder[] = JSON.parse(json);
    await getDatabase(); // ensure tables exist

    for (const r of reminders) {
      const habit: Habit = {
        id: r.id,
        message: r.message,
        hour: r.hour,
        minute: r.minute,
        days: r.days,
        enabled: r.enabled,
        notificationIds: r.notificationIds,
        createdAt: r.createdAt,
        category: 'other',
        icon: '📌',
        streak: 0,
        bestStreak: 0,
      };
      await insertHabit(habit);
    }

    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.setItem(MIGRATION_FLAG, 'true');
  } catch (error) {
    console.error('Migration failed, will retry next launch:', error);
    // Don't set the flag — retry next time
  }
}
```

**Step 2: Commit**

```bash
git add services/migration.ts
git commit -m "feat: add AsyncStorage to SQLite migration service"
```

---

### Task 5: Create streak calculation utility

**Files:**
- Create: `services/streaks.ts`

**Step 1: Create streak calculator**

```typescript
// services/streaks.ts
import { Habit } from '../types/habit';
import { getCompletionsForHabit, updateHabit } from './database';

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Get the expo weekday (1=Sun..7=Sat) for a JS Date
function getExpoWeekday(date: Date): number {
  return date.getDay() + 1; // JS: 0=Sun..6=Sat → Expo: 1=Sun..7=Sat
}

function isScheduledDay(date: Date, days: number[]): boolean {
  return days.includes(getExpoWeekday(date));
}

export function getTodayString(): string {
  return formatDate(new Date());
}

/**
 * Calculate the current streak for a habit by walking backward from today.
 * Only counts scheduled days. Non-scheduled days are skipped (don't break streak).
 */
export async function calculateStreak(habit: Habit): Promise<{ streak: number; bestStreak: number }> {
  const completions = await getCompletionsForHabit(habit.id);
  const completedDates = new Set(completions.filter(c => c.completed).map(c => c.date));

  let streak = 0;
  const today = new Date();
  const date = new Date(today);

  // Check today first — if today is scheduled but not yet completed, start from yesterday
  if (isScheduledDay(date, habit.days) && !completedDates.has(formatDate(date))) {
    date.setDate(date.getDate() - 1);
  }

  // Walk backward
  for (let i = 0; i < 365; i++) {
    if (isScheduledDay(date, habit.days)) {
      if (completedDates.has(formatDate(date))) {
        streak++;
      } else {
        break;
      }
    }
    date.setDate(date.getDate() - 1);
  }

  const bestStreak = Math.max(streak, habit.bestStreak);
  return { streak, bestStreak };
}

/**
 * Recalculate and persist streak for a habit.
 */
export async function updateStreakForHabit(habit: Habit): Promise<Habit> {
  const { streak, bestStreak } = await calculateStreak(habit);
  const updated = { ...habit, streak, bestStreak };
  await updateHabit(updated);
  return updated;
}

/**
 * Get the milestone badge for a streak count, if any.
 */
export function getStreakMilestone(streak: number): string | null {
  if (streak >= 100) return 'Unstoppable';
  if (streak >= 30) return 'One month';
  if (streak >= 7) return 'One week';
  if (streak >= 3) return 'Getting started';
  return null;
}
```

**Step 2: Commit**

```bash
git add services/streaks.ts
git commit -m "feat: add streak calculation and milestone utilities"
```

---

## Phase 2: Theme System

### Task 6: Create ThemeContext with accent color support

**Files:**
- Create: `contexts/ThemeContext.tsx`

**Step 1: Create the theme context**

```typescript
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
```

**Step 2: Commit**

```bash
git add contexts/ThemeContext.tsx
git commit -m "feat: add ThemeContext with accent color and mode persistence"
```

---

### Task 7: Refactor theme.ts to support accent colors

**Files:**
- Modify: `constants/theme.ts`

**Step 1: Rewrite theme.ts**

Replace the entire `constants/theme.ts` with a version that generates colors from mode + accent. Keep the same `ThemeColors` shape so existing components don't break, but the `primary`/`fab`/`toggle`/`day` colors now derive from the accent.

```typescript
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
```

**Step 2: Commit**

```bash
git add constants/theme.ts
git commit -m "feat: refactor theme to generate colors from accent color"
```

---

### Task 8: Create useAppTheme hook

**Files:**
- Create: `hooks/use-app-theme.ts`

**Step 1: Create the hook that connects ThemeContext to getColors**

```typescript
// hooks/use-app-theme.ts
import { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { getColors, ThemeColors } from '../constants/theme';

export function useAppTheme(): ThemeColors {
  const { resolvedScheme, accentColor } = useTheme();
  return useMemo(() => getColors(resolvedScheme, accentColor), [resolvedScheme, accentColor]);
}
```

**Step 2: Commit**

```bash
git add hooks/use-app-theme.ts
git commit -m "feat: add useAppTheme hook connecting context to color generation"
```

---

## Phase 3: Navigation Restructure

### Task 9: Create tab layout with Today, Stats, Settings

**Files:**
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/index.tsx` (will be the dashboard — placeholder for now)
- Create: `app/(tabs)/stats.tsx` (placeholder)
- Create: `app/(tabs)/settings.tsx` (placeholder)
- Modify: `app/_layout.tsx`

**Step 1: Create tabs layout**

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/use-app-theme';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const colors = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          height: 60 + (Platform.OS === 'ios' ? insets.bottom : 8),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="today-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

**Step 2: Create placeholder tab screens**

```typescript
// app/(tabs)/index.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../hooks/use-app-theme';

export default function TodayScreen() {
  const colors = useAppTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.text, fontSize: 20 }}>Today Dashboard</Text>
      </View>
    </SafeAreaView>
  );
}
```

```typescript
// app/(tabs)/stats.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../hooks/use-app-theme';

export default function StatsScreen() {
  const colors = useAppTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.text, fontSize: 20 }}>Stats</Text>
      </View>
    </SafeAreaView>
  );
}
```

```typescript
// app/(tabs)/settings.tsx
import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../hooks/use-app-theme';

export default function SettingsScreen() {
  const colors = useAppTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: colors.text, fontSize: 20 }}>Settings</Text>
      </View>
    </SafeAreaView>
  );
}
```

**Step 3: Update root layout to use ThemeProvider and tabs**

Rewrite `app/_layout.tsx`:

```typescript
// app/_layout.tsx
import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { setupNotifications, requestPermissions } from '../services/notifications';
import { migrateIfNeeded } from '../services/migration';
import { getAllHabits } from '../services/database';
import { scheduleReminder, cancelAllReminders } from '../services/notifications';
import { updateStreakForHabit } from '../services/streaks';

function AppContent() {
  const { resolvedScheme } = useTheme();

  useEffect(() => {
    async function init() {
      await migrateIfNeeded();
      await setupNotifications();
      await requestPermissions();

      // Re-sync all notifications on launch
      const habits = await getAllHabits();
      await cancelAllReminders();
      for (const h of habits) {
        if (h.enabled) {
          await scheduleReminder(h);
        }
        // Recalculate streaks on launch
        await updateStreakForHabit(h);
      }
    }
    init();
  }, []);

  return (
    <NavThemeProvider value={resolvedScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="add-reminder"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
```

**Step 4: Remove old `app/index.tsx`** — the old home screen is now replaced by `app/(tabs)/index.tsx`. Delete `app/index.tsx`.

**Step 5: Verify the app launches with tabs**

```bash
npm start
```

Press `i` for iOS or `a` for Android. Verify three tabs appear and the add-reminder modal still works.

**Step 6: Commit**

```bash
git add app/(tabs)/_layout.tsx app/(tabs)/index.tsx app/(tabs)/stats.tsx app/(tabs)/settings.tsx app/_layout.tsx
git rm app/index.tsx
git commit -m "feat: restructure navigation to bottom tabs with ThemeProvider"
```

---

## Phase 4: Core UI Components

### Task 10: Create ProgressRing SVG component

**Files:**
- Create: `components/ProgressRing.tsx`

**Step 1: Create the component**

```typescript
// components/ProgressRing.tsx
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface Props {
  size: number;
  strokeWidth: number;
  progress: number; // 0 to 1
  color: string;
  bgColor: string;
  children?: React.ReactNode;
}

export default function ProgressRing({ size, strokeWidth, progress, color, bgColor, children }: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {children}
    </View>
  );
}
```

**Step 2: Commit**

```bash
git add components/ProgressRing.tsx
git commit -m "feat: add ProgressRing SVG component"
```

---

### Task 11: Create HabitCard component with completion checkbox

**Files:**
- Create: `components/HabitCard.tsx`

**Step 1: Create HabitCard**

This replaces `ReminderCard.tsx` with a new version that adds a completion checkbox, streak display, and category icon.

```typescript
// components/HabitCard.tsx
import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, Switch, Pressable, Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Habit } from '../types/habit';
import { ThemeColors, Spacing, BorderRadius, FontSize } from '../constants/theme';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 7];

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  return `${h}:${m} ${period}`;
}

interface Props {
  habit: Habit;
  colors: ThemeColors;
  isCompletedToday: boolean;
  onToggle: (id: string, enabled: boolean) => void;
  onPress: (habit: Habit) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  index: number;
}

export default function HabitCard({
  habit, colors, isCompletedToday, onToggle, onPress, onDelete, onComplete, index,
}: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const swipeableRef = useRef<Swipeable>(null);
  const checkAnim = useRef(new Animated.Value(isCompletedToday ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  React.useEffect(() => {
    Animated.spring(checkAnim, {
      toValue: isCompletedToday ? 1 : 0,
      tension: 200,
      friction: 15,
      useNativeDriver: true,
    }).start();
  }, [isCompletedToday]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, tension: 300, friction: 10, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }).start();
  };

  const handleCheckPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete(habit.id);
  };

  const handleToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(habit.id, value);
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({ inputRange: [-100, -50, 0], outputRange: [1, 0.8, 0], extrapolate: 'clamp' });
    const opacity = dragX.interpolate({ inputRange: [-100, -50, 0], outputRange: [1, 0.8, 0], extrapolate: 'clamp' });
    return (
      <Animated.View style={[styles.deleteAction, { backgroundColor: colors.danger, opacity }]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Text style={styles.deleteIcon}>🗑️</Text>
          <Text style={styles.deleteText}>Delete</Text>
        </Animated.View>
      </Animated.View>
    );
  };

  const renderLeftActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({ inputRange: [0, 50, 100], outputRange: [0, 0.8, 1], extrapolate: 'clamp' });
    const opacity = dragX.interpolate({ inputRange: [0, 50, 100], outputRange: [0, 0.8, 1], extrapolate: 'clamp' });
    return (
      <Animated.View style={[styles.deleteActionLeft, { backgroundColor: colors.danger, opacity }]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Text style={styles.deleteIcon}>🗑️</Text>
          <Text style={styles.deleteText}>Delete</Text>
        </Animated.View>
      </Animated.View>
    );
  };

  const handleSwipeOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    swipeableRef.current?.close();
    onDelete(habit.id);
  };

  const checkScale = checkAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });

  return (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        onSwipeableOpen={handleSwipeOpen}
        overshootRight={false}
        overshootLeft={false}
        friction={2}
        rightThreshold={80}
        leftThreshold={80}
        containerStyle={styles.swipeContainer}
      >
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => onPress(habit)}
          style={[styles.card, {
            backgroundColor: colors.surface,
            borderColor: habit.enabled ? colors.primary + '30' : colors.border,
            shadowColor: colors.shadow,
            opacity: isCompletedToday ? 0.7 : 1,
          }]}
        >
          <View style={styles.cardContent}>
            {/* Checkbox */}
            <Pressable onPress={handleCheckPress} style={styles.checkboxContainer}>
              <Animated.View style={[styles.checkbox, {
                backgroundColor: isCompletedToday ? colors.primary : 'transparent',
                borderColor: isCompletedToday ? colors.primary : colors.border,
                transform: [{ scale: checkScale }],
              }]}>
                {isCompletedToday && <Text style={styles.checkmark}>✓</Text>}
              </Animated.View>
            </Pressable>

            {/* Content */}
            <View style={styles.centerSection}>
              <View style={styles.topRow}>
                <Text style={styles.habitIcon}>{habit.icon}</Text>
                <Text style={[styles.time, {
                  color: habit.enabled ? colors.text : colors.textMuted,
                  textDecorationLine: isCompletedToday ? 'line-through' : 'none',
                }]}>
                  {formatTime(habit.hour, habit.minute)}
                </Text>
                {habit.streak > 0 && (
                  <View style={[styles.streakBadge, { backgroundColor: colors.streakFire + '20' }]}>
                    <Text style={styles.streakText}>🔥 {habit.streak}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[styles.message, {
                  color: habit.enabled ? colors.textSecondary : colors.textMuted,
                  textDecorationLine: isCompletedToday ? 'line-through' : 'none',
                }]}
                numberOfLines={2}
              >
                {habit.message}
              </Text>
              <View style={styles.daysRow}>
                {DAY_VALUES.map((day, i) => {
                  const isActive = habit.days.includes(day);
                  return (
                    <View key={day} style={[styles.dayDot, {
                      backgroundColor: isActive ? (habit.enabled ? colors.primary : colors.textMuted) : 'transparent',
                      borderColor: isActive ? 'transparent' : (habit.enabled ? colors.border : colors.borderLight),
                    }]}>
                      <Text style={[styles.dayDotText, {
                        color: isActive ? '#fff' : (habit.enabled ? colors.textMuted : colors.borderLight),
                      }]}>
                        {DAY_LABELS[i][0]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Toggle */}
            <View style={styles.rightSection}>
              <Switch
                value={habit.enabled}
                onValueChange={handleToggle}
                trackColor={{ false: colors.toggleTrackOff, true: colors.toggleTrackOn }}
                thumbColor="#ffffff"
                ios_backgroundColor={colors.toggleTrackOff}
              />
            </View>
          </View>
        </Pressable>
      </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  card: { borderRadius: BorderRadius.lg, borderWidth: 1, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardContent: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg },
  checkboxContainer: { marginRight: Spacing.md, padding: 4 },
  checkbox: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: -1 },
  centerSection: { flex: 1, marginRight: Spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  habitIcon: { fontSize: 18 },
  time: { fontSize: FontSize.xl, fontWeight: '700', letterSpacing: -0.5 },
  streakBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.full, marginLeft: 4 },
  streakText: { fontSize: FontSize.xs, fontWeight: '700' },
  message: { fontSize: FontSize.md, marginTop: Spacing.xs, lineHeight: 20 },
  daysRow: { flexDirection: 'row', marginTop: Spacing.sm, gap: 4 },
  dayDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  dayDotText: { fontSize: 10, fontWeight: '600' },
  rightSection: { alignItems: 'center', justifyContent: 'center' },
  deleteAction: { justifyContent: 'center', alignItems: 'center', width: 90, borderTopRightRadius: BorderRadius.lg, borderBottomRightRadius: BorderRadius.lg },
  deleteActionLeft: { justifyContent: 'center', alignItems: 'center', width: 90, borderTopLeftRadius: BorderRadius.lg, borderBottomLeftRadius: BorderRadius.lg },
  deleteIcon: { fontSize: 22, textAlign: 'center' },
  deleteText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700', marginTop: 2, textAlign: 'center' },
});
```

**Step 2: Commit**

```bash
git add components/HabitCard.tsx
git commit -m "feat: add HabitCard component with completion checkbox and streak display"
```

---

### Task 12: Create CategoryPicker and IconPicker components

**Files:**
- Create: `components/CategoryPicker.tsx`
- Create: `components/IconPicker.tsx`

**Step 1: Create CategoryPicker**

```typescript
// components/CategoryPicker.tsx
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CategoryType, CATEGORIES } from '../types/habit';
import { ThemeColors, Spacing, BorderRadius, FontSize } from '../constants/theme';

interface Props {
  selected: CategoryType;
  onChange: (category: CategoryType) => void;
  colors: ThemeColors;
}

export default function CategoryPicker({ selected, onChange, colors }: Props) {
  const handlePress = (type: CategoryType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(type);
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {CATEGORIES.map(cat => {
        const isActive = selected === cat.type;
        return (
          <Pressable
            key={cat.type}
            onPress={() => handlePress(cat.type)}
            style={[styles.chip, {
              backgroundColor: isActive ? colors.primaryBg : colors.surface,
              borderColor: isActive ? colors.primary : colors.border,
            }]}
          >
            <Text style={styles.chipIcon}>{cat.defaultIcon}</Text>
            <Text style={[styles.chipLabel, { color: isActive ? colors.primary : colors.textSecondary }]}>
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.xs, gap: Spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.full, borderWidth: 1.5, gap: 6 },
  chipIcon: { fontSize: 16 },
  chipLabel: { fontSize: FontSize.sm, fontWeight: '600' },
});
```

**Step 2: Create IconPicker**

```typescript
// components/IconPicker.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CategoryType, CATEGORY_ICONS } from '../types/habit';
import { ThemeColors, Spacing, BorderRadius } from '../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = Spacing.lg * 2;
const ICON_SIZE = 44;
const NUM_COLUMNS = Math.floor((SCREEN_WIDTH - GRID_PADDING) / (ICON_SIZE + Spacing.sm));

interface Props {
  category: CategoryType;
  selected: string;
  onChange: (icon: string) => void;
  colors: ThemeColors;
}

export default function IconPicker({ category, selected, onChange, colors }: Props) {
  const icons = CATEGORY_ICONS[category];

  return (
    <View style={styles.grid}>
      {icons.map(icon => {
        const isActive = selected === icon;
        return (
          <Pressable
            key={icon}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(icon);
            }}
            style={[styles.iconButton, {
              backgroundColor: isActive ? colors.primaryBg : 'transparent',
              borderColor: isActive ? colors.primary : colors.border,
            }]}
          >
            <Text style={styles.iconText}>{icon}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  iconButton: { width: ICON_SIZE, height: ICON_SIZE, borderRadius: BorderRadius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 22 },
});
```

**Step 3: Commit**

```bash
git add components/CategoryPicker.tsx components/IconPicker.tsx
git commit -m "feat: add CategoryPicker and IconPicker components"
```

---

### Task 13: Create Confetti celebration component

**Files:**
- Create: `components/Confetti.tsx`

**Step 1: Create confetti animation using Reanimated**

```typescript
// components/Confetti.tsx
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONFETTI_COUNT = 30;
const CONFETTI_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#14b8a6'];

interface Props {
  visible: boolean;
  onComplete?: () => void;
}

function ConfettiPiece({ delay, color }: { delay: number; color: string }) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const startX = Math.random() * SCREEN_WIDTH;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT + 50,
        duration: 2000 + Math.random() * 1000,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: (Math.random() - 0.5) * 200,
        duration: 2000 + Math.random() * 1000,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 2500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: Math.random() * 10,
        duration: 2500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 10], outputRange: ['0deg', '3600deg'] });

  return (
    <Animated.View
      style={[styles.piece, {
        left: startX,
        backgroundColor: color,
        width: 8 + Math.random() * 6,
        height: 8 + Math.random() * 6,
        borderRadius: Math.random() > 0.5 ? 50 : 2,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate: spin }],
      }]}
    />
  );
}

export default function Confetti({ visible, onComplete }: Props) {
  useEffect(() => {
    if (visible && onComplete) {
      const timer = setTimeout(onComplete, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
        <ConfettiPiece
          key={i}
          delay={i * 50}
          color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
  piece: { position: 'absolute', top: -20 },
});
```

**Step 2: Commit**

```bash
git add components/Confetti.tsx
git commit -m "feat: add Confetti celebration animation component"
```

---

## Phase 5: Build Screens

### Task 14: Build the Today Dashboard

**Files:**
- Modify: `app/(tabs)/index.tsx` (replace placeholder)

**Step 1: Implement the full dashboard**

This is the largest single file. It replaces the placeholder with the full dashboard: greeting, progress ring, habit list with completion, confetti, FAB, toast.

```typescript
// app/(tabs)/index.tsx
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, Animated, RefreshControl,
  SectionList, Dimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../hooks/use-app-theme';
import { Habit } from '../../types/habit';
import { getAllHabits, getCompletionsForDate, toggleCompletion, deleteHabit as deleteHabitDb, updateHabit } from '../../services/database';
import { scheduleReminder, cancelReminder } from '../../services/notifications';
import { updateStreakForHabit, getTodayString, getStreakMilestone } from '../../services/streaks';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import HabitCard from '../../components/HabitCard';
import EmptyState from '../../components/EmptyState';
import Toast from '../../components/Toast';
import ProgressRing from '../../components/ProgressRing';
import Confetti from '../../components/Confetti';

const SCREEN_WIDTH = Dimensions.get('window').width;
const RING_SIZE = Math.min(SCREEN_WIDTH * 0.35, 160);

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getExpoWeekday(): number {
  return new Date().getDay() + 1;
}

export default function TodayScreen() {
  const colors = useAppTheme();
  const router = useRouter();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const fabScale = useRef(new Animated.Value(1)).current;

  const todayStr = getTodayString();
  const todayWeekday = getExpoWeekday();

  const loadData = useCallback(async () => {
    const allHabits = await getAllHabits();
    const todayCompletions = await getCompletionsForDate(todayStr);
    const completedSet = new Set(todayCompletions.filter(c => c.completed).map(c => c.habitId));
    setHabits(allHabits);
    setCompletedIds(completedSet);
    return { allHabits, completedSet };
  }, [todayStr]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const todaysHabits = habits.filter(h => h.enabled && h.days.includes(todayWeekday));
  const completedCount = todaysHabits.filter(h => completedIds.has(h.id)).length;
  const totalCount = todaysHabits.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  // Separate into pending and done
  const pendingHabits = habits.filter(h => h.days.includes(todayWeekday) && !completedIds.has(h.id));
  const doneHabits = habits.filter(h => h.days.includes(todayWeekday) && completedIds.has(h.id));
  const otherHabits = habits.filter(h => !h.days.includes(todayWeekday));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleComplete = async (id: string) => {
    const isCompleted = completedIds.has(id);
    const newCompleted = new Set(completedIds);

    if (isCompleted) {
      newCompleted.delete(id);
    } else {
      newCompleted.add(id);
    }
    setCompletedIds(newCompleted);

    await toggleCompletion(id, todayStr, !isCompleted);

    // Update streak
    const habit = habits.find(h => h.id === id);
    if (habit) {
      const updated = await updateStreakForHabit(habit);
      setHabits(prev => prev.map(h => h.id === id ? updated : h));

      if (!isCompleted) {
        // Check milestone
        const milestone = getStreakMilestone(updated.streak);
        if (milestone && updated.streak === 3 || updated.streak === 7 || updated.streak === 30 || updated.streak === 100) {
          setToastMessage(`🏆 ${milestone}! ${updated.streak} day streak!`);
          setToastVisible(true);
        }

        // Check if all done
        const newCompletedCount = todaysHabits.filter(h => newCompleted.has(h.id)).length;
        if (newCompletedCount === totalCount && totalCount > 0) {
          setShowConfetti(true);
          setToastMessage('🎉 All habits completed today!');
          setToastVisible(true);
        }
      }
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    const updated = { ...habit, enabled };
    setHabits(prev => prev.map(h => h.id === id ? updated : h));
    await updateHabit(updated);

    const newIds = await scheduleReminder(updated);
    const final = { ...updated, notificationIds: newIds };
    setHabits(prev => prev.map(h => h.id === id ? final : h));
    await updateHabit(final);
  };

  const handleDelete = async (id: string) => {
    const habit = habits.find(h => h.id === id);
    if (habit) {
      await cancelReminder(habit.notificationIds);
    }
    await deleteHabitDb(id);
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  const handlePress = (habit: Habit) => {
    router.push({ pathname: '/add-reminder', params: { id: habit.id } });
  };

  const handleFabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/add-reminder');
  };

  const handleFabPressIn = () => {
    Animated.spring(fabScale, { toValue: 0.9, tension: 300, friction: 10, useNativeDriver: true }).start();
  };

  const handleFabPressOut = () => {
    Animated.spring(fabScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }).start();
  };

  // Top streaks
  const topStreaks = [...habits].filter(h => h.streak > 0).sort((a, b) => b.streak - a.streak).slice(0, 3);

  const allData = [
    ...pendingHabits.map(h => ({ ...h, _section: 'pending' })),
    ...doneHabits.map(h => ({ ...h, _section: 'done' })),
    ...otherHabits.map(h => ({ ...h, _section: 'other' })),
  ];

  const renderHeader = () => (
    <View>
      {/* Greeting + Progress */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            {getGreeting()} 👋
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>My Habits</Text>
          {topStreaks.length > 0 && (
            <View style={styles.streakRow}>
              {topStreaks.map(h => (
                <View key={h.id} style={[styles.streakChip, { backgroundColor: colors.streakFire + '15' }]}>
                  <Text style={styles.streakChipText}>{h.icon} 🔥{h.streak}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        {totalCount > 0 && (
          <View style={styles.ringContainer}>
            <ProgressRing
              size={RING_SIZE}
              strokeWidth={10}
              progress={progress}
              color={colors.primary}
              bgColor={colors.progressRingBg}
            >
              <Text style={[styles.ringText, { color: colors.text }]}>{completedCount}/{totalCount}</Text>
              <Text style={[styles.ringLabel, { color: colors.textMuted }]}>done</Text>
            </ProgressRing>
          </View>
        )}
      </View>

      {/* Section header for pending */}
      {pendingHabits.length > 0 && (
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
          TO DO
        </Text>
      )}
    </View>
  );

  const renderItem = ({ item, index }: { item: Habit & { _section: string }; index: number }) => {
    // Section headers between groups
    const showDoneHeader = item._section === 'done' && index === pendingHabits.length;
    const showOtherHeader = item._section === 'other' && index === pendingHabits.length + doneHabits.length;

    return (
      <View>
        {showDoneHeader && doneHabits.length > 0 && (
          <Text style={[styles.sectionHeader, { color: colors.success }]}>COMPLETED ✓</Text>
        )}
        {showOtherHeader && otherHabits.length > 0 && (
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>OTHER DAYS</Text>
        )}
        <HabitCard
          habit={item}
          colors={colors}
          isCompletedToday={completedIds.has(item.id)}
          onToggle={handleToggle}
          onPress={handlePress}
          onDelete={handleDelete}
          onComplete={handleComplete}
          index={index}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {habits.length === 0 ? (
        <>
          {renderHeader()}
          <EmptyState colors={colors} />
        </>
      ) : (
        <FlatList
          data={allData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}

      {/* FAB */}
      <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}>
        <Pressable
          onPress={handleFabPress}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          style={[styles.fab, { backgroundColor: colors.fab, shadowColor: colors.fabShadow }]}
        >
          <Text style={styles.fabIcon}>+</Text>
        </Pressable>
      </Animated.View>

      <Toast message={toastMessage} visible={toastVisible} onHide={() => setToastVisible(false)} />
      <Confetti visible={showConfetti} onComplete={() => setShowConfetti(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  headerLeft: { flex: 1 },
  greeting: { fontSize: FontSize.md, fontWeight: '500', marginBottom: 2 },
  title: { fontSize: FontSize.hero, fontWeight: '800', letterSpacing: -0.5 },
  streakRow: { flexDirection: 'row', marginTop: Spacing.sm, gap: 6, flexWrap: 'wrap' },
  streakChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  streakChipText: { fontSize: FontSize.xs, fontWeight: '600' },
  ringContainer: { marginLeft: Spacing.md },
  ringText: { fontSize: FontSize.xl, fontWeight: '800' },
  ringLabel: { fontSize: FontSize.xs, fontWeight: '500' },
  sectionHeader: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  list: { paddingBottom: 120 },
  fabContainer: { position: 'absolute', bottom: 30, right: 20 },
  fab: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.8, shadowRadius: 12, elevation: 8 },
  fabIcon: { fontSize: 32, color: '#ffffff', fontWeight: '300', marginTop: -2 },
});
```

**Step 2: Run the app and verify dashboard renders**

```bash
npm start
```

**Step 3: Commit**

```bash
git add app/\(tabs\)/index.tsx
git commit -m "feat: build Today dashboard with progress ring, completion, and confetti"
```

---

### Task 15: Update add-reminder screen with category and icon pickers

**Files:**
- Modify: `app/add-reminder.tsx`

**Step 1: Update the add-reminder screen**

Update `app/add-reminder.tsx` to:
- Import from `types/habit` instead of `types/reminder`
- Use database service instead of storage service
- Add CategoryPicker and IconPicker sections
- Handle the new `category` and `icon` fields

Key changes to the existing file:
- Replace `Reminder` import with `Habit, CategoryType, CATEGORIES`
- Replace `loadReminders/saveReminders` with `getAllHabits/getHabitById/insertHabit/updateHabit as updateHabitDb`
- Add `category` and `icon` state
- Add CategoryPicker and IconPicker in the form
- Update `handleSave` to use database operations and include new fields
- Replace `useThemeColors(colorScheme)` with `useAppTheme()`

The full file should be rewritten incorporating these changes while keeping the existing time picker, day selector, and preview card patterns.

**Step 2: Run and verify creating/editing habits works**

```bash
npm start
```

**Step 3: Commit**

```bash
git add app/add-reminder.tsx
git commit -m "feat: add category and icon pickers to habit creation screen"
```

---

### Task 16: Build Settings screen

**Files:**
- Modify: `app/(tabs)/settings.tsx` (replace placeholder)

**Step 1: Implement settings screen**

```typescript
// app/(tabs)/settings.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../hooks/use-app-theme';
import { useTheme, ACCENT_COLORS, ThemeMode } from '../../contexts/ThemeContext';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';

const THEME_OPTIONS: { label: string; value: ThemeMode; icon: string }[] = [
  { label: 'Light', value: 'light', icon: '☀️' },
  { label: 'Dark', value: 'dark', icon: '🌙' },
  { label: 'System', value: 'system', icon: '📱' },
];

export default function SettingsScreen() {
  const colors = useAppTheme();
  const { mode, accentColor, setMode, setAccentColor } = useTheme();

  const handleModeChange = (newMode: ThemeMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(newMode);
  };

  const handleAccentChange = (color: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAccentColor(color);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

        {/* Theme Mode */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>APPEARANCE</Text>
          <View style={[styles.segmentedControl, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {THEME_OPTIONS.map(option => {
              const isActive = mode === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => handleModeChange(option.value)}
                  style={[styles.segment, isActive && { backgroundColor: colors.primaryBg }]}
                >
                  <Text style={styles.segmentIcon}>{option.icon}</Text>
                  <Text style={[styles.segmentLabel, { color: isActive ? colors.primary : colors.textSecondary }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Accent Color */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ACCENT COLOR</Text>
          <View style={[styles.colorGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {ACCENT_COLORS.map(color => {
              const isActive = accentColor === color.value;
              return (
                <Pressable
                  key={color.value}
                  onPress={() => handleAccentChange(color.value)}
                  style={styles.colorOption}
                >
                  <View style={[styles.colorSwatch, {
                    backgroundColor: color.value,
                    borderWidth: isActive ? 3 : 0,
                    borderColor: colors.text,
                  }]}>
                    {isActive && <Text style={styles.colorCheck}>✓</Text>}
                  </View>
                  <Text style={[styles.colorName, { color: isActive ? colors.text : colors.textMuted }]}>
                    {color.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Preview */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PREVIEW</Text>
          <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.previewRow}>
              <View style={[styles.previewCheckbox, { backgroundColor: colors.primary }]}>
                <Text style={styles.previewCheck}>✓</Text>
              </View>
              <View style={styles.previewContent}>
                <Text style={[styles.previewTitle, { color: colors.text }]}>Sample Habit</Text>
                <Text style={[styles.previewSub, { color: colors.textSecondary }]}>This is how your cards will look</Text>
              </View>
              <View style={[styles.previewBadge, { backgroundColor: colors.primaryBg }]}>
                <Text style={[styles.previewBadgeText, { color: colors.primary }]}>🔥 7</Text>
              </View>
            </View>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={[styles.appInfo, { color: colors.textMuted }]}>Daily Companion v2.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.xl, paddingBottom: 120 },
  title: { fontSize: FontSize.hero, fontWeight: '800', letterSpacing: -0.5, marginBottom: Spacing.xxl },
  section: { marginBottom: Spacing.xxl },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1, marginBottom: Spacing.sm, marginLeft: Spacing.xs },
  segmentedControl: { flexDirection: 'row', borderRadius: BorderRadius.lg, borderWidth: 1, overflow: 'hidden' },
  segment: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md + 2, gap: 4 },
  segmentIcon: { fontSize: 20 },
  segmentLabel: { fontSize: FontSize.sm, fontWeight: '600' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1, gap: Spacing.lg, justifyContent: 'center' },
  colorOption: { alignItems: 'center', width: 60 },
  colorSwatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  colorCheck: { color: '#fff', fontSize: 18, fontWeight: '800' },
  colorName: { fontSize: FontSize.xs, fontWeight: '500', marginTop: 4 },
  previewCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg },
  previewRow: { flexDirection: 'row', alignItems: 'center' },
  previewCheckbox: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  previewCheck: { color: '#fff', fontSize: 16, fontWeight: '700' },
  previewContent: { flex: 1 },
  previewTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  previewSub: { fontSize: FontSize.sm, marginTop: 2 },
  previewBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
  previewBadgeText: { fontSize: FontSize.sm, fontWeight: '700' },
  appInfo: { fontSize: FontSize.sm, textAlign: 'center', marginTop: Spacing.lg },
});
```

**Step 2: Commit**

```bash
git add app/\(tabs\)/settings.tsx
git commit -m "feat: build Settings screen with theme mode and accent color picker"
```

---

### Task 17: Build Stats screen with charts

**Files:**
- Modify: `app/(tabs)/stats.tsx` (replace placeholder)
- Create: `components/WeeklyBarChart.tsx`
- Create: `components/MonthlyHeatMap.tsx`

**Step 1: Create WeeklyBarChart**

```typescript
// components/WeeklyBarChart.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeColors, Spacing, FontSize, BorderRadius } from '../constants/theme';

interface Props {
  data: { day: string; count: number; total: number }[];
  colors: ThemeColors;
}

export default function WeeklyBarChart({ data, colors }: Props) {
  const maxTotal = Math.max(...data.map(d => d.total), 1);

  return (
    <View style={styles.container}>
      {data.map((item, i) => {
        const height = item.total > 0 ? (item.count / item.total) * 100 : 0;
        return (
          <View key={i} style={styles.barColumn}>
            <View style={styles.barWrapper}>
              <View style={[styles.barBg, { backgroundColor: colors.progressRingBg }]}>
                <View style={[styles.barFill, {
                  backgroundColor: colors.primary,
                  height: `${height}%`,
                }]} />
              </View>
            </View>
            <Text style={[styles.label, { color: colors.textMuted }]}>{item.day}</Text>
            <Text style={[styles.value, { color: colors.textSecondary }]}>
              {item.total > 0 ? `${item.count}/${item.total}` : '-'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 160, paddingHorizontal: Spacing.sm },
  barColumn: { alignItems: 'center', flex: 1 },
  barWrapper: { height: 100, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  barBg: { width: 20, height: 100, borderRadius: 10, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 10 },
  label: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 6 },
  value: { fontSize: 9, fontWeight: '500', marginTop: 2 },
});
```

**Step 2: Create MonthlyHeatMap**

```typescript
// components/MonthlyHeatMap.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeColors, Spacing, FontSize } from '../constants/theme';

interface Props {
  // Map of "YYYY-MM-DD" -> completion ratio (0-1)
  data: Record<string, number>;
  colors: ThemeColors;
  year: number;
  month: number; // 0-indexed
}

export default function MonthlyHeatMap({ data, colors, year, month }: Props) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay(); // 0=Sun

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const monthName = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getColor = (day: number | null): string => {
    if (day === null) return 'transparent';
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const key = `${year}-${m}-${d}`;
    const ratio = data[key] ?? -1;
    if (ratio < 0) return colors.progressRingBg;
    if (ratio === 0) return colors.danger + '30';
    if (ratio < 1) return colors.primary + '60';
    return colors.primary;
  };

  return (
    <View>
      <Text style={[styles.monthTitle, { color: colors.text }]}>{monthName}</Text>
      <View style={styles.dayLabels}>
        {dayLabels.map((l, i) => (
          <Text key={i} style={[styles.dayLabel, { color: colors.textMuted }]}>{l}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, i) => (
          <View key={i} style={[styles.cell, { backgroundColor: getColor(day) }]}>
            {day !== null && (
              <Text style={[styles.cellText, {
                color: (data[`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`] ?? -1) >= 1 ? '#fff' : colors.textMuted,
              }]}>
                {day}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monthTitle: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.sm },
  dayLabels: { flexDirection: 'row', marginBottom: 4 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: FontSize.xs, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100/7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 6, marginBottom: 2 },
  cellText: { fontSize: FontSize.xs, fontWeight: '500' },
});
```

**Step 3: Build the Stats screen**

```typescript
// app/(tabs)/stats.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAppTheme } from '../../hooks/use-app-theme';
import { getAllHabits, getCompletionsInRange } from '../../services/database';
import { Habit } from '../../types/habit';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import WeeklyBarChart from '../../components/WeeklyBarChart';
import MonthlyHeatMap from '../../components/MonthlyHeatMap';

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getExpoWeekday(date: Date): number {
  return date.getDay() + 1;
}

export default function StatsScreen() {
  const colors = useAppTheme();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ day: string; count: number; total: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<Record<string, number>>({});

  const now = new Date();

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const loadStats = async () => {
    const allHabits = await getAllHabits();
    setHabits(allHabits);

    // Weekly data (last 7 days)
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekCompletions = await getCompletionsInRange(formatDate(weekStart), formatDate(weekEnd));
    const completedMap = new Map<string, Set<string>>();
    for (const c of weekCompletions) {
      if (c.completed) {
        if (!completedMap.has(c.date)) completedMap.set(c.date, new Set());
        completedMap.get(c.date)!.add(c.habitId);
      }
    }

    const weekly = dayLabels.map((label, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = formatDate(date);
      const weekday = getExpoWeekday(date);
      const scheduledHabits = allHabits.filter(h => h.enabled && h.days.includes(weekday));
      const completed = completedMap.get(dateStr)?.size ?? 0;
      return { day: label.substring(0, 3), count: Math.min(completed, scheduledHabits.length), total: scheduledHabits.length };
    });
    setWeeklyData(weekly);

    // Monthly heatmap
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthCompletions = await getCompletionsInRange(formatDate(monthStart), formatDate(monthEnd));

    const monthMap: Record<string, Set<string>> = {};
    for (const c of monthCompletions) {
      if (c.completed) {
        if (!monthMap[c.date]) monthMap[c.date] = new Set();
        monthMap[c.date].add(c.habitId);
      }
    }

    const heatData: Record<string, number> = {};
    for (let d = 1; d <= monthEnd.getDate(); d++) {
      const date = new Date(now.getFullYear(), now.getMonth(), d);
      const dateStr = formatDate(date);
      const weekday = getExpoWeekday(date);
      const scheduled = allHabits.filter(h => h.enabled && h.days.includes(weekday)).length;
      if (scheduled > 0) {
        const completed = monthMap[dateStr]?.size ?? 0;
        heatData[dateStr] = completed / scheduled;
      }
    }
    setMonthlyData(heatData);
  };

  const totalCompletions = habits.reduce((sum, h) => sum + h.streak, 0);
  const bestStreak = habits.reduce((max, h) => Math.max(max, h.bestStreak), 0);
  const activeStreaks = habits.filter(h => h.streak > 0).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Statistics</Text>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>{activeStreaks}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Active{'\n'}Streaks</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryValue, { color: colors.streakFire }]}>🔥 {bestStreak}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Best{'\n'}Streak</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryValue, { color: colors.success }]}>{habits.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total{'\n'}Habits</Text>
          </View>
        </View>

        {/* Weekly Chart */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>THIS WEEK</Text>
          <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <WeeklyBarChart data={weeklyData} colors={colors} />
          </View>
        </View>

        {/* Monthly Heatmap */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>THIS MONTH</Text>
          <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MonthlyHeatMap
              data={monthlyData}
              colors={colors}
              year={now.getFullYear()}
              month={now.getMonth()}
            />
          </View>
        </View>

        {/* Per-habit streaks */}
        {habits.filter(h => h.streak > 0).length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>STREAK LEADERS</Text>
            {habits.filter(h => h.streak > 0).sort((a, b) => b.streak - a.streak).map(h => (
              <View key={h.id} style={[styles.streakRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={styles.streakIcon}>{h.icon}</Text>
                <View style={styles.streakInfo}>
                  <Text style={[styles.streakName, { color: colors.text }]} numberOfLines={1}>{h.message}</Text>
                  <Text style={[styles.streakSub, { color: colors.textMuted }]}>Best: {h.bestStreak} days</Text>
                </View>
                <View style={[styles.streakBadge, { backgroundColor: colors.streakFire + '15' }]}>
                  <Text style={[styles.streakBadgeText, { color: colors.streakFire }]}>🔥 {h.streak}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.xl, paddingBottom: 120 },
  title: { fontSize: FontSize.hero, fontWeight: '800', letterSpacing: -0.5, marginBottom: Spacing.xxl },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xxl },
  summaryCard: { flex: 1, alignItems: 'center', padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1 },
  summaryValue: { fontSize: FontSize.xl, fontWeight: '800', marginBottom: 4 },
  summaryLabel: { fontSize: FontSize.xs, fontWeight: '500', textAlign: 'center', lineHeight: 15 },
  section: { marginBottom: Spacing.xxl },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1, marginBottom: Spacing.sm, marginLeft: Spacing.xs },
  chartCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg },
  streakRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.sm },
  streakIcon: { fontSize: 24, marginRight: Spacing.md },
  streakInfo: { flex: 1 },
  streakName: { fontSize: FontSize.md, fontWeight: '600' },
  streakSub: { fontSize: FontSize.xs, marginTop: 2 },
  streakBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  streakBadgeText: { fontSize: FontSize.sm, fontWeight: '700' },
});
```

**Step 4: Commit**

```bash
git add components/WeeklyBarChart.tsx components/MonthlyHeatMap.tsx app/\(tabs\)/stats.tsx
git commit -m "feat: build Stats screen with weekly bar chart, monthly heatmap, and streak leaders"
```

---

### Task 18: Update notifications service for Habit type

**Files:**
- Modify: `services/notifications.ts`

**Step 1: Update to accept Habit instead of Reminder**

Change the import from `Reminder` to `Habit`, and update the function signatures. The notification scheduling logic stays identical since `Habit` has the same `hour`, `minute`, `days`, `enabled`, `notificationIds`, and `message` fields.

```typescript
// Change line 4:
// import { Reminder } from "../types/reminder";
// to:
import { Habit } from "../types/habit";

// Change function signatures:
// scheduleReminder(reminder: Reminder) → scheduleReminder(reminder: Habit)
// All internal logic stays the same since the fields used are identical.
```

**Step 2: Commit**

```bash
git add services/notifications.ts
git commit -m "refactor: update notifications service to use Habit type"
```

---

## Phase 6: Cleanup

### Task 19: Remove old files and update imports

**Files:**
- Delete: `types/reminder.ts`
- Delete: `components/ReminderCard.tsx` (replaced by HabitCard)
- Delete: `services/storage.ts` (replaced by database.ts)
- Verify: all imports across the app point to new modules

**Step 1: Delete old files**

```bash
git rm types/reminder.ts components/ReminderCard.tsx services/storage.ts
```

**Step 2: Search for any remaining imports of old modules**

```bash
grep -r "types/reminder" app/ components/ services/ hooks/
grep -r "services/storage" app/ components/ services/ hooks/
grep -r "ReminderCard" app/ components/
```

Fix any remaining references.

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove legacy Reminder types and AsyncStorage service"
```

---

### Task 20: Update notification quick actions

**Files:**
- Modify: `services/notifications.ts`

**Step 1: Add notification category with "Mark as Done" action**

Add to `setupNotifications()`:

```typescript
await Notifications.setNotificationCategoryAsync('habit', [
  {
    identifier: 'MARK_DONE',
    buttonTitle: 'Mark as Done ✓',
    options: { opensAppToForeground: false },
  },
]);
```

Update `scheduleReminder` to include `categoryIdentifier: 'habit'` in the content.

**Step 2: Add response listener in `app/_layout.tsx`**

In the `init` function of `AppContent`, add a notification response listener that handles the `MARK_DONE` action by toggling completion for the habit.

**Step 3: Commit**

```bash
git add services/notifications.ts app/_layout.tsx
git commit -m "feat: add notification quick action to mark habits as done"
```

---

### Task 21: Final verification and lint

**Step 1: Run linter**

```bash
npm run lint
```

**Step 2: Fix any lint errors**

**Step 3: Run the app on both platforms**

```bash
npm start
```

Test:
- Creating a habit with category and icon
- Completing a habit (checkbox)
- Streak incrementing
- All-done confetti
- Stats screen charts
- Settings theme mode switch
- Settings accent color change
- Dark/light mode
- Migration from old data (if any)

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve lint errors and polish"
```

---

### Task 22: Update CLAUDE.md with new architecture

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update to reflect new architecture**

Update the CLAUDE.md to document: tab navigation, SQLite database, ThemeContext, Habit type, completions, streaks, new screens, new dependencies.

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for Daily Companion architecture"
```
