# Daily Companion — Habit Tracker Evolution

**Date:** 2026-03-02
**Status:** Approved
**Approach:** Transform reminder app into a daily habit tracking companion

---

## Goal

Make users open the app every day by adding habit tracking with streaks, progress visualization, and engagement mechanics. Fully offline, general audience.

## Data Model

### Habit (replaces Reminder)

```typescript
interface Habit {
  id: string;
  message: string;
  hour: number;
  minute: number;
  days: number[];           // 1=Sun..7=Sat
  enabled: boolean;
  notificationIds: string[];
  createdAt: number;
  category: CategoryType;   // 'health' | 'work' | 'personal' | 'fitness' | 'learning' | 'other'
  icon: string;             // emoji: '💧', '💊', '🏃'
  streak: number;
  bestStreak: number;
}

type CategoryType = 'health' | 'work' | 'personal' | 'fitness' | 'learning' | 'other';
```

### SQLite Schema

```sql
CREATE TABLE habits (
  id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  hour INTEGER,
  minute INTEGER,
  days TEXT,              -- JSON array
  enabled INTEGER,
  notificationIds TEXT,   -- JSON array
  category TEXT,
  icon TEXT,
  streak INTEGER DEFAULT 0,
  bestStreak INTEGER DEFAULT 0,
  createdAt INTEGER
);

CREATE TABLE completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habitId TEXT NOT NULL,
  date TEXT NOT NULL,      -- "YYYY-MM-DD"
  completed INTEGER,
  UNIQUE(habitId, date),
  FOREIGN KEY(habitId) REFERENCES habits(id) ON DELETE CASCADE
);
```

### Preferences (AsyncStorage)

```typescript
interface AppPreferences {
  themeMode: 'light' | 'dark' | 'system';
  accentColor: string; // one of 9 presets
}
```

Key: `@app_preferences`

## Screen Architecture

### Bottom Tab Navigation

Three tabs: **Today** | **Stats** | **Settings**

### Today Dashboard (`app/index.tsx` — redesigned)

- Greeting + daily progress ring (e.g., "5 of 8 done")
- Active streaks summary (top 3 with fire icon)
- Habit list grouped by category, each card:
  - Icon + message + time
  - Tap-to-complete checkbox with animation + haptics
  - Current streak count
- Completed habits slide to "Done" section at bottom
- FAB to add new habit

### Stats Screen (`app/stats.tsx` — new)

- Weekly completion bar chart (Mon-Sun)
- Monthly heatmap grid (GitHub-style)
- Overall stats: total completions, best streak, active streaks
- Per-habit drill-down on tap

### Settings Screen (`app/settings.tsx` — new)

- Theme mode: Light / Dark / System (segmented control)
- Accent color picker: 9 circular swatches (Blue, Purple, Teal, Green, Orange, Red, Pink, Yellow, Indigo)
- Preview card showing accent in context

### Add/Edit Habit (`app/add-reminder.tsx` — enhanced)

- Existing: message, time picker, day selector
- New: category picker (horizontal chips), icon picker (emoji grid)

## Theming System

### Theme Context (`contexts/ThemeContext.tsx`)

Provides `{ mode, accentColor, setMode, setAccentColor }` to entire app.

### Accent Color Application

Accent color applies to: progress ring, streak badges, FAB, active tab indicator, toggle switches, checkbox fill, category chip highlights.

### Implementation

`constants/theme.ts` updated — `getColors(mode, accent)` function returns full palette. Themed components read from context.

## Engagement Mechanics

### Streaks

- Increments when all *scheduled* days are completed
- Resets only when a scheduled day is missed (non-scheduled days don't break streaks)
- Calculated on app open by walking `completions` backward

### Completion Flow

1. Tap checkbox → scale + checkmark animation + haptic
2. Card slides to "Done" section
3. Progress ring fills incrementally
4. All done → confetti celebration (react-native-reanimated)

### Milestone Badges

| Streak | Badge |
|--------|-------|
| 3 days | Getting started |
| 7 days | One week |
| 30 days | One month |
| 100 days | Unstoppable |

Special toast with animation on milestone hit.

### Notification Quick Actions

- "Mark as Done" button on notification (Android & iOS)
- Uses `expo-notifications` category actions

## Migration Strategy

On first launch after update:
1. Check for `@daily_reminders` in AsyncStorage
2. Migrate each reminder to SQLite with defaults: `category='other'`, `icon='📌'`, `streak=0`, `bestStreak=0`
3. Clear AsyncStorage key on success
4. Retry on next launch if failed

## Responsive Layout

### Safe Areas

- `SafeAreaView` per screen with appropriate `edges`
- Dashboard/Stats: `edges={['top']}`, scroll behind tab bar
- Modal: `edges={['top', 'bottom']}`

### Tab Bar

- Absolute positioned, translucent with blur (iOS) / semi-transparent (Android)
- Height includes `useSafeAreaInsets().bottom`
- Content scrolls underneath

### Responsive Sizing

- No hardcoded widths — flex, percentage, Dimensions
- Progress ring: `Math.min(screenWidth * 0.4, 180)`
- Cards: full width with 16px horizontal padding
- Charts: full width minus padding
- Icon pickers: numColumns from screen width

### Keyboard

- `KeyboardAvoidingView` on Add/Edit screen
- `behavior="padding"` (iOS) / `"height"` (Android)

### Orientation

- Portrait locked via `app.json`

## New Dependencies

| Package | Purpose |
|---------|---------|
| `expo-sqlite` | Local database |
| `react-native-svg` | Progress ring, charts |

## Files Changed/Added

| File | Change |
|------|--------|
| `types/reminder.ts` | Replaced with `types/habit.ts` |
| `services/storage.ts` | Rewritten for SQLite |
| `services/notifications.ts` | Add quick action support |
| `constants/theme.ts` | `getColors(mode, accent)` function |
| `contexts/ThemeContext.tsx` | New — theme context provider |
| `app/_layout.tsx` | Tab navigation, theme provider |
| `app/index.tsx` | Redesigned dashboard |
| `app/add-reminder.tsx` | Category + icon picker added |
| `app/stats.tsx` | New stats screen |
| `app/settings.tsx` | New settings screen |
| `components/ReminderCard.tsx` | Becomes HabitCard with checkbox |
| `components/ProgressRing.tsx` | New — SVG progress ring |
| `components/CategoryPicker.tsx` | New |
| `components/IconPicker.tsx` | New |
| `components/Confetti.tsx` | New — celebration animation |
| `components/HeatMap.tsx` | New — monthly heatmap |
| `components/BarChart.tsx` | New — weekly bar chart |
| `services/migration.ts` | New — AsyncStorage → SQLite |
| `services/database.ts` | New — SQLite operations |
