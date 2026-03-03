import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { Habit } from "../types/habit";
import { notifyLog } from "./logger";

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

  await Notifications.setNotificationCategoryAsync("habit", [
    {
      identifier: "MARK_DONE",
      buttonTitle: "Mark as Done ✓",
      options: { opensAppToForeground: false },
    },
  ]);

  notifyLog.setup();
}

export async function requestPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn("Must use physical device for notifications");
    notifyLog.permissionResult(false);
    return false;
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") {
    notifyLog.permissionResult(true);
    return true;
  }
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  const granted = status === "granted";
  notifyLog.permissionResult(granted);
  return granted;
}

export async function scheduleReminder(
  reminder: Habit
): Promise<string[]> {
  await cancelReminder(reminder.notificationIds);

  if (!reminder.enabled) return [];

  const ids: string[] = [];
  const content: Notifications.NotificationContentInput = {
    title: "Daily Companion",
    body: `${reminder.icon} ${reminder.message}`,
    categoryIdentifier: "habit",
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
    notifyLog.scheduled(reminder.message, ids, `DAILY at ${reminder.hour}:${String(reminder.minute).padStart(2, '0')}`);
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
    notifyLog.scheduled(reminder.message, ids, `WEEKLY on days [${reminder.days.join(',')}] at ${reminder.hour}:${String(reminder.minute).padStart(2, '0')}`);
  }

  return ids;
}

// Fix #14: Use Promise.allSettled so one failure doesn't block others
export async function cancelReminder(notificationIds: string[]) {
  if (notificationIds.length === 0) return;

  const results = await Promise.allSettled(
    notificationIds.map(id => Notifications.cancelScheduledNotificationAsync(id))
  );

  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'rejected') {
      notifyLog.cancelError(notificationIds[i], (results[i] as PromiseRejectedResult).reason);
    }
  }

  notifyLog.cancelled(notificationIds);
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  notifyLog.cancelledAll();
}
