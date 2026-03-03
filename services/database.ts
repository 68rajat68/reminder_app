// services/database.ts
import * as SQLite from 'expo-sqlite';
import { Habit, Completion, CategoryType } from '../types/habit';
import { dbLog } from './logger';

// Fix #8: Promise-based singleton prevents concurrent initialization race
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const database = await SQLite.openDatabaseAsync('dailycompanion.db');
      await database.execAsync(`
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
      dbLog.initialized();
      return database;
    })();
  }
  return dbPromise;
}

// Fix #2: Safe JSON.parse with fallback for corrupt data
function safeJsonParse<T>(value: string, fallback: T, field: string, habitId: string): T {
  try {
    return JSON.parse(value);
  } catch {
    dbLog.parseError(field, value, habitId);
    return fallback;
  }
}

function rowToHabit(row: {
  id: string; message: string; hour: number; minute: number;
  days: string; enabled: number; notificationIds: string;
  category: string; icon: string; streak: number; bestStreak: number;
  createdAt: number;
}): Habit {
  return {
    id: row.id,
    message: row.message,
    hour: row.hour,
    minute: row.minute,
    days: safeJsonParse<number[]>(row.days, [], 'days', row.id),
    enabled: row.enabled === 1,
    notificationIds: safeJsonParse<string[]>(row.notificationIds, [], 'notificationIds', row.id),
    category: row.category as CategoryType,
    icon: row.icon,
    streak: row.streak,
    bestStreak: row.bestStreak,
    createdAt: row.createdAt,
  };
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

  const habits = rows.map(rowToHabit);
  dbLog.allHabitsLoaded(habits);
  return habits;
}

export async function getHabitById(id: string): Promise<Habit | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    id: string; message: string; hour: number; minute: number;
    days: string; enabled: number; notificationIds: string;
    category: string; icon: string; streak: number; bestStreak: number;
    createdAt: number;
  }>('SELECT * FROM habits WHERE id = ?', [id]);

  if (!row) {
    dbLog.queryResult('getHabitById', 0);
    return null;
  }
  dbLog.queryResult('getHabitById', 1);
  return rowToHabit(row);
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
  dbLog.habitInserted(habit);
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
  dbLog.habitUpdated(habit);
}

export async function deleteHabit(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM habits WHERE id = ?', [id]);
  dbLog.habitDeleted(id);
}

// --- Completions ---

export async function getCompletionsForDate(date: string): Promise<Completion[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ habitId: string; date: string; completed: number }>(
    'SELECT habitId, date, completed FROM completions WHERE date = ?', [date]
  );
  dbLog.completionsLoaded(date, rows.length);
  return rows.map(r => ({ habitId: r.habitId, date: r.date, completed: r.completed === 1 }));
}

export async function getCompletionsForHabit(habitId: string): Promise<Completion[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ habitId: string; date: string; completed: number }>(
    'SELECT habitId, date, completed FROM completions WHERE habitId = ? ORDER BY date DESC', [habitId]
  );
  dbLog.queryResult(`getCompletionsForHabit(${habitId})`, rows.length);
  return rows.map(r => ({ habitId: r.habitId, date: r.date, completed: r.completed === 1 }));
}

export async function getCompletionsInRange(startDate: string, endDate: string): Promise<Completion[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ habitId: string; date: string; completed: number }>(
    'SELECT habitId, date, completed FROM completions WHERE date >= ? AND date <= ? ORDER BY date', [startDate, endDate]
  );
  dbLog.queryResult(`getCompletionsInRange(${startDate}..${endDate})`, rows.length);
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
  dbLog.completionToggled(habitId, date, completed);
}
