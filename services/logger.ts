// services/logger.ts
// Development-only structured logger for debugging DB, notifications, streaks, and app lifecycle.
// All output is suppressed in production builds.

const IS_DEV = __DEV__;

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const LEVEL_ICONS: Record<LogLevel, string> = {
  debug: '🔍',
  info: '✅',
  warn: '⚠️',
  error: '❌',
};

const TAG_COLORS: Record<string, string> = {
  DB: '\x1b[36m',       // cyan
  NOTIFY: '\x1b[35m',   // magenta
  STREAK: '\x1b[33m',   // yellow
  MIGRATE: '\x1b[34m',  // blue
  APP: '\x1b[32m',      // green
  THEME: '\x1b[31m',    // red
};

const RESET = '\x1b[0m';

function formatTimestamp(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
}

function log(level: LogLevel, tag: string, message: string, data?: unknown) {
  if (!IS_DEV) return;

  const icon = LEVEL_ICONS[level];
  const color = TAG_COLORS[tag] || '';
  const timestamp = formatTimestamp();
  const prefix = `${icon} [${timestamp}] ${color}[${tag}]${RESET}`;

  if (data !== undefined) {
    let serialized: string;
    try {
      serialized = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
    } catch {
      serialized = '[Unserializable data]';
    }
    console[level === 'debug' ? 'log' : level](`${prefix} ${message}\n`, serialized);
  } else {
    console[level === 'debug' ? 'log' : level](`${prefix} ${message}`);
  }
}

// --- Database operations ---

export const dbLog = {
  initialized: () =>
    log('info', 'DB', 'Database initialized (WAL mode, foreign keys ON)'),

  habitInserted: (habit: { id: string; message: string; days: number[]; hour: number; minute: number; category: string }) =>
    log('info', 'DB', `Habit INSERTED: "${habit.message}"`, {
      id: habit.id,
      schedule: `${habit.hour}:${String(habit.minute).padStart(2, '0')}`,
      days: habit.days,
      category: habit.category,
    }),

  habitUpdated: (habit: { id: string; message: string; streak: number; bestStreak: number; enabled: boolean; notificationIds: string[] }) =>
    log('info', 'DB', `Habit UPDATED: "${habit.message}"`, {
      id: habit.id,
      streak: habit.streak,
      bestStreak: habit.bestStreak,
      enabled: habit.enabled,
      notificationIds: habit.notificationIds,
    }),

  habitDeleted: (id: string) =>
    log('warn', 'DB', `Habit DELETED: ${id} (cascade: completions removed)`),

  completionToggled: (habitId: string, date: string, completed: boolean) =>
    log('info', 'DB', `Completion ${completed ? 'SET' : 'REMOVED'}: habit=${habitId}, date=${date}`),

  queryResult: (operation: string, count: number) =>
    log('debug', 'DB', `${operation} returned ${count} rows`),

  allHabitsLoaded: (habits: { id: string; message: string; enabled: boolean; streak: number }[]) =>
    log('debug', 'DB', `Loaded ${habits.length} habits`, habits.map(h => ({
      id: h.id,
      msg: h.message.substring(0, 30),
      enabled: h.enabled,
      streak: h.streak,
    }))),

  completionsLoaded: (date: string, count: number) =>
    log('debug', 'DB', `Loaded ${count} completions for date=${date}`),

  parseError: (field: string, value: string, habitId: string) =>
    log('error', 'DB', `JSON.parse FAILED for ${field} on habit ${habitId}`, { rawValue: value }),

  error: (operation: string, err: unknown) =>
    log('error', 'DB', `${operation} FAILED`, err),
};

// --- Notifications ---

export const notifyLog = {
  setup: () =>
    log('info', 'NOTIFY', 'Notification handler and channel configured'),

  permissionResult: (granted: boolean) =>
    log('info', 'NOTIFY', `Permission ${granted ? 'GRANTED' : 'DENIED'}`),

  scheduled: (habitMessage: string, ids: string[], trigger: string) =>
    log('info', 'NOTIFY', `Scheduled "${habitMessage}" → ${ids.length} notification(s)`, {
      ids,
      trigger,
    }),

  cancelled: (ids: string[]) =>
    log('debug', 'NOTIFY', `Cancelled ${ids.length} notification(s)`, ids),

  cancelledAll: () =>
    log('warn', 'NOTIFY', 'ALL scheduled notifications cancelled'),

  quickAction: (actionId: string, notificationId: string, matched: boolean) =>
    log('info', 'NOTIFY', `Quick action "${actionId}" on notification ${notificationId} — ${matched ? 'MATCHED habit' : 'NO MATCH'}`, {
      actionId,
      notificationId,
    }),

  cancelError: (id: string, err: unknown) =>
    log('warn', 'NOTIFY', `Failed to cancel notification ${id}`, err),

  error: (operation: string, err: unknown) =>
    log('error', 'NOTIFY', `${operation} FAILED`, err),
};

// --- Streaks ---

export const streakLog = {
  calculated: (habitId: string, message: string, streak: number, bestStreak: number) =>
    log('debug', 'STREAK', `"${message}" → streak=${streak}, best=${bestStreak}`, { habitId }),

  milestone: (message: string, streak: number, milestone: string) =>
    log('info', 'STREAK', `MILESTONE: "${message}" hit ${milestone} (${streak} days)`),

  error: (habitId: string, err: unknown) =>
    log('error', 'STREAK', `Calculation failed for habit ${habitId}`, err),
};

// --- Migration ---

export const migrateLog = {
  skipped: (reason: string) =>
    log('debug', 'MIGRATE', `Skipped: ${reason}`),

  started: (count: number) =>
    log('info', 'MIGRATE', `Starting migration of ${count} legacy reminders`),

  habitMigrated: (id: string, message: string) =>
    log('info', 'MIGRATE', `Migrated: "${message}" (${id})`),

  completed: (count: number) =>
    log('info', 'MIGRATE', `Migration COMPLETED: ${count} habits migrated`),

  error: (err: unknown) =>
    log('error', 'MIGRATE', 'Migration FAILED (will retry next launch)', err),
};

// --- App lifecycle ---

export const appLog = {
  initStarted: () =>
    log('info', 'APP', 'App initialization started'),

  initCompleted: (habitCount: number) =>
    log('info', 'APP', `App initialization completed — ${habitCount} habits synced`),

  syncHabit: (id: string, message: string, action: string) =>
    log('debug', 'APP', `Sync: "${message}" — ${action}`, { id }),

  syncError: (id: string, err: unknown) =>
    log('error', 'APP', `Sync failed for habit ${id}`, err),

  foregroundReload: () =>
    log('info', 'APP', 'App returned to foreground — reloading data'),

  dateRollover: (oldDate: string, newDate: string) =>
    log('info', 'APP', `Date rollover detected: ${oldDate} → ${newDate}`),

  error: (operation: string, err: unknown) =>
    log('error', 'APP', `${operation} FAILED`, err),
};

// --- Theme ---

export const themeLog = {
  loaded: (mode: string, accent: string) =>
    log('debug', 'THEME', `Preferences loaded: mode=${mode}, accent=${accent}`),

  changed: (field: string, value: string) =>
    log('info', 'THEME', `${field} changed to ${value}`),

  persisted: (mode: string, accent: string) =>
    log('debug', 'THEME', `Preferences saved: mode=${mode}, accent=${accent}`),

  error: (err: unknown) =>
    log('error', 'THEME', 'Failed to save preferences', err),
};
