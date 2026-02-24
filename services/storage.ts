import AsyncStorage from "@react-native-async-storage/async-storage";
import { Reminder } from "../types/reminder";

const STORAGE_KEY = "@daily_reminders";

export async function loadReminders(): Promise<Reminder[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEY);
  if (!json) return [];
  return JSON.parse(json);
}

export async function saveReminders(reminders: Reminder[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}
