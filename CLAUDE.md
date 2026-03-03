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
- `app/_layout.tsx` — Root layout: GestureHandlerRootView, ThemeProvider, migration, notification sync, streak recalc. Per-habit try-catch + top-level try-catch around init.
- `app/(tabs)/_layout.tsx` — Bottom tab navigator (Today / Stats / Settings)
- `app/(tabs)/index.tsx` — Today dashboard: progress ring, habit list with completion checkboxes, confetti. Uses `useWindowDimensions` for responsive ring. AppState listener with 2s debounce for foreground reload and midnight date rollover.
- `app/(tabs)/stats.tsx` — Statistics: weekly bar chart, monthly heatmap, streak leaders. Fresh date computed inside `loadStats()`.
- `app/(tabs)/settings.tsx` — Theme mode (light/dark/system), accent color picker
- `app/add-reminder.tsx` — Modal for creating/editing habits with category and icon selection. `scheduleReminder` wrapped in try-catch for web/permission-denied resilience.

### Data Layer

1. **Database** (`services/database.ts`): expo-sqlite with two tables (`habits`, `completions`). Promise-based singleton (`dbPromise`) prevents race conditions. `safeJsonParse()` helper with fallback for corrupt JSON columns. All CRUD operations are async functions with structured logging.
2. **Migration** (`services/migration.ts`): One-time AsyncStorage → SQLite migration using `INSERT OR IGNORE` for idempotent re-migration. Checks `result.changes > 0` to count only actually inserted rows.
3. **Streaks** (`services/streaks.ts`): Walks backward through completions to calculate consecutive streaks. Only scheduled days count — non-scheduled days don't break streaks.
4. **Notifications** (`services/notifications.ts`): Expo Notifications with daily/weekly triggers. Includes "Mark as Done" quick action category. `cancelReminder` uses `Promise.allSettled` so one failure doesn't block others.
5. **Logger** (`services/logger.ts`): Dev-only (`__DEV__`) structured logging with namespaced loggers: `dbLog`, `notifyLog`, `streakLog`, `migrateLog`, `appLog`, `themeLog`. ANSI color-coded tags, timestamped, level-based (debug/info/warn/error). JSON.stringify wrapped in try-catch for circular ref safety.

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

- **ThemeContext** (`contexts/ThemeContext.tsx`): Provides mode (light/dark/system) and accent color, persisted in AsyncStorage under `@app_preferences`. Uses refs (`modeRef`/`accentRef`) to prevent stale closure race in `savePrefs`. `setMode`/`setAccentColor` wrapped in `useCallback`.
- **getColors()** (`constants/theme.ts`): Generates full color palette from scheme + accent hex. Accent colors derive primary, fab, toggles, day selectors, etc.
- **useAppTheme()** (`hooks/use-app-theme.ts`): Hook connecting context to color generation. All screens use this — never use `useColorScheme()` directly for themed components.
- 9 accent presets: Blue, Purple, Teal, Green, Orange, Red, Pink, Yellow, Indigo.

### Key Components

- `HabitCard` — Completion checkbox, streak badge, swipe-to-delete with `Alert.alert` confirmation dialog, enable/disable toggle
- `ProgressRing` — SVG circular progress (react-native-svg)
- `CategoryPicker` / `IconPicker` — Category chips and emoji grid for habit creation
- `WeeklyBarChart` / `MonthlyHeatMap` — Stats visualizations
- `Confetti` — Celebration animation when all daily habits are completed. Uses `useWindowDimensions`.
- `DaySelector` — Day picker with presets (Every day, Weekdays, Weekends)
- `Toast` — Transient feedback (streak milestones, completion). Uses `useAppTheme()` for correct theming.

### Key Patterns

- **Notification sync** on app launch reschedules all enabled habits, persists new notification IDs via `updateHabit()`, and recalculates streaks
- **Notification quick action**: "Mark as Done" button on notifications triggers completion without opening app
- **Streak milestones**: 3 days (Getting started), 7 (One week), 30 (One month), 100 (Unstoppable)
- **Haptic feedback** via `expo-haptics` on all interactions
- **Portrait locked** via `app.json` orientation config
- **Responsive layout**: Always use `useWindowDimensions()` instead of module-level `Dimensions.get()` for dynamic sizing
- **Error resilience**: All `scheduleReminder()` calls wrapped in try-catch; notification failures never block habit CRUD operations
- **Date freshness**: `todayStr`/`todayWeekday` computed inside `loadData()` callbacks, not in stale closures

### Web Support

- **Metro config** (`metro.config.js`): Adds `wasm` to `assetExts` and sets `Cross-Origin-Embedder-Policy: credentialless` + `Cross-Origin-Opener-Policy: same-origin` headers for `SharedArrayBuffer` (required by expo-sqlite web/wa-sqlite).
- **Known web limitations**:
  - `expo-notifications` APIs throw `ERR_UNAVAILABLE` on web — handled gracefully by try-catch
  - `react-native-gesture-handler` `Swipeable` doesn't support web swipe gestures
  - `useNativeDriver` falls back to JS animation on web
  - `expo-haptics` is a no-op on web

### Path Alias

`@/*` maps to the project root (configured in `tsconfig.json`).

### Platform Config

- Android package: `com.rajatjangid.dailyreminders`
- New Architecture enabled
- Typed routes and React Compiler experiments enabled
- Android notification channel: `"reminders"` with MAX importance
- `expo-sqlite` registered in `app.json` plugins array (required for EAS/prebuild builds)

### Pre-existing Issues (not introduced by us)

- `components/collapsible.tsx` and `hooks/use-theme-color.ts` reference non-existent `Colors` export from `constants/theme.ts` — these files are unused scaffolding from Expo template
- 6 lint warnings about missing deps in animation `useEffect` hooks (Confetti, EmptyState, HabitCard, Toast) — intentional one-time mount animations
