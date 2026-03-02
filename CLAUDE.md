# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Daily Companion — a cross-platform habit tracking app built with **Expo (SDK 54)** and **React Native 0.81**. Users create habits with categories and icons, track daily completions, build streaks, and view progress stats. Fully offline with SQLite storage. No backend.

## Development Commands

| Command | Purpose |
|---------|---------|
| `npm start` | Launch Expo dev server |
| `npm run android` | Run on Android emulator |
| `npm run ios` | Run on iOS simulator |
| `npm run web` | Run in web browser |
| `npm run lint` | ESLint check (`expo lint`) |
| `npm run build:apk` | Local Android APK build |
| `npm run build:apk:cloud` | Cloud APK build via EAS |

## Architecture

### Routing

File-based routing via **Expo Router** (`app/` directory):
- `app/_layout.tsx` — Root layout: GestureHandlerRootView, ThemeProvider, migration, notification sync, streak recalc
- `app/(tabs)/_layout.tsx` — Bottom tab navigator (Today / Stats / Settings)
- `app/(tabs)/index.tsx` — Today dashboard: progress ring, habit list with completion checkboxes, confetti
- `app/(tabs)/stats.tsx` — Statistics: weekly bar chart, monthly heatmap, streak leaders
- `app/(tabs)/settings.tsx` — Theme mode (light/dark/system), accent color picker
- `app/add-reminder.tsx` — Modal for creating/editing habits with category and icon selection

### Data Layer

1. **Database** (`services/database.ts`): expo-sqlite with two tables (`habits`, `completions`). All CRUD operations are async functions.
2. **Migration** (`services/migration.ts`): One-time AsyncStorage → SQLite migration on first launch after upgrade.
3. **Streaks** (`services/streaks.ts`): Walks backward through completions to calculate consecutive streaks. Only scheduled days count — non-scheduled days don't break streaks.
4. **Notifications** (`services/notifications.ts`): Expo Notifications with daily/weekly triggers. Includes "Mark as Done" quick action category.

### Habit Data Model (`types/habit.ts`)

```typescript
{
  id: string;              // Timestamp-based
  message: string;         // Max 200 chars
  hour: number;            // 0-23
  minute: number;          // 0-59
  days: number[];          // 1=Sun..7=Sat (Expo weekday format)
  enabled: boolean;
  notificationIds: string[];
  createdAt: number;
  category: CategoryType;  // 'health' | 'work' | 'personal' | 'fitness' | 'learning' | 'other'
  icon: string;            // emoji
  streak: number;
  bestStreak: number;
}
```

Completions stored separately: `{ habitId, date ("YYYY-MM-DD"), completed }`.

### Theme System

- **ThemeContext** (`contexts/ThemeContext.tsx`): Provides mode (light/dark/system) and accent color, persisted in AsyncStorage under `@app_preferences`.
- **getColors()** (`constants/theme.ts`): Generates full color palette from scheme + accent hex. Accent colors derive primary, fab, toggles, day selectors, etc.
- **useAppTheme()** (`hooks/use-app-theme.ts`): Hook connecting context to color generation. All screens use this.
- 9 accent presets: Blue, Purple, Teal, Green, Orange, Red, Pink, Yellow, Indigo.

### Key Components

- `HabitCard` — Completion checkbox, streak badge, swipe-to-delete, enable/disable toggle
- `ProgressRing` — SVG circular progress (react-native-svg)
- `CategoryPicker` / `IconPicker` — Category chips and emoji grid for habit creation
- `WeeklyBarChart` / `MonthlyHeatMap` — Stats visualizations
- `Confetti` — Celebration animation when all daily habits are completed
- `DaySelector` — Day picker with presets (Every day, Weekdays, Weekends)
- `Toast` — Transient feedback (streak milestones, completion)

### Key Patterns

- **Notification sync** on app launch reschedules all enabled habits and recalculates streaks
- **Notification quick action**: "Mark as Done" button on notifications triggers completion without opening app
- **Streak milestones**: 3 days (Getting started), 7 (One week), 30 (One month), 100 (Unstoppable)
- **Haptic feedback** via `expo-haptics` on all interactions
- **Portrait locked** via `app.json` orientation config

### Path Alias

`@/*` maps to the project root (configured in `tsconfig.json`).

### Platform Config

- Android package: `com.rajatjangid.dailyreminders`
- New Architecture enabled
- Typed routes and React Compiler experiments enabled
- Android notification channel: `"reminders"` with MAX importance
