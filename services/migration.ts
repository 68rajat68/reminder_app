// services/migration.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDatabase } from './database';
import { Habit } from '../types/habit';
import { migrateLog } from './logger';

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
  if (migrated === 'true') {
    migrateLog.skipped('already migrated');
    return;
  }

  const json = await AsyncStorage.getItem(STORAGE_KEY);
  if (!json) {
    // No legacy data — mark as migrated
    await AsyncStorage.setItem(MIGRATION_FLAG, 'true');
    migrateLog.skipped('no legacy data');
    return;
  }

  try {
    const reminders: LegacyReminder[] = JSON.parse(json);
    const database = await getDatabase(); // ensure tables exist

    migrateLog.started(reminders.length);

    // Fix #3: Use INSERT OR IGNORE so partial re-migrations don't deadlock on duplicate PKs
    let migratedCount = 0;
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
      await database.runAsync(
        `INSERT OR IGNORE INTO habits (id, message, hour, minute, days, enabled, notificationIds, category, icon, streak, bestStreak, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [habit.id, habit.message, habit.hour, habit.minute,
         JSON.stringify(habit.days), habit.enabled ? 1 : 0,
         JSON.stringify(habit.notificationIds), habit.category,
         habit.icon, habit.streak, habit.bestStreak, habit.createdAt]
      );
      migrateLog.habitMigrated(habit.id, habit.message);
      migratedCount++;
    }

    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.setItem(MIGRATION_FLAG, 'true');
    migrateLog.completed(migratedCount);
  } catch (error) {
    migrateLog.error(error);
    // Don't set the flag — retry next time
  }
}
