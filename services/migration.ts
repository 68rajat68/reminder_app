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
