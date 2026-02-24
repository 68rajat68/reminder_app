import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { Reminder } from "../types/reminder";

export async function setupNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Reminders",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: "default",
    });
  }
}

export async function requestPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn("Must use physical device for notifications");
    return false;
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return status === "granted";
}

export async function scheduleReminder(
  reminder: Reminder
): Promise<string[]> {
  await cancelReminder(reminder.notificationIds);

  if (!reminder.enabled) return [];

  const ids: string[] = [];
  const content: Notifications.NotificationContentInput = {
    title: "Reminder",
    body: reminder.message,
    sound: "default",
    ...(Platform.OS === "android" ? { channelId: "reminders" } : {}),
  };

  if (reminder.days.length === 7) {
    const id = await Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: reminder.hour,
        minute: reminder.minute,
      },
    });
    ids.push(id);
  } else {
    for (const weekday of reminder.days) {
      const id = await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday,
          hour: reminder.hour,
          minute: reminder.minute,
        },
      });
      ids.push(id);
    }
  }

  return ids;
}

export async function cancelReminder(notificationIds: string[]) {
  for (const id of notificationIds) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
