import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { setupNotifications, requestPermissions, scheduleReminder, cancelAllReminders } from '../services/notifications';
import { migrateIfNeeded } from '../services/migration';
import { getAllHabits, updateHabit, toggleCompletion } from '../services/database';
import { updateStreakForHabit, getTodayString } from '../services/streaks';
import { appLog, notifyLog } from '../services/logger';

function AppContent() {
  const { resolvedScheme } = useTheme();

  useEffect(() => {
    async function init() {
      appLog.initStarted();

      await migrateIfNeeded();
      await setupNotifications();
      await requestPermissions();

      // Re-sync all notifications on launch
      const habits = await getAllHabits();
      await cancelAllReminders();

      let syncedCount = 0;
      for (const h of habits) {
        // Fix #6: try-catch per habit so one failure doesn't block the rest
        try {
          if (h.enabled) {
            // Fix #1: Persist new notification IDs back to the database
            const newIds = await scheduleReminder(h);
            const withIds = { ...h, notificationIds: newIds };
            await updateHabit(withIds);
            appLog.syncHabit(h.id, h.message, `rescheduled (${newIds.length} notifications)`);
          } else {
            appLog.syncHabit(h.id, h.message, 'skipped (disabled)');
          }
          // Recalculate streaks on launch
          await updateStreakForHabit(h);
          syncedCount++;
        } catch (e) {
          appLog.syncError(h.id, e);
        }
      }

      appLog.initCompleted(syncedCount);
    }
    init();

    // Listen for notification quick actions
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const actionId = response.actionIdentifier;
      const notificationId = response.notification.request.identifier;

      if (actionId === 'MARK_DONE') {
        // Fix #1: Now that IDs are persisted, this match works correctly
        const allHabits = await getAllHabits();
        let matched = false;
        for (const habit of allHabits) {
          if (habit.notificationIds.includes(notificationId)) {
            await toggleCompletion(habit.id, getTodayString(), true);
            await updateStreakForHabit(habit);
            matched = true;
            notifyLog.quickAction(actionId, notificationId, true);
            break;
          }
        }
        if (!matched) {
          notifyLog.quickAction(actionId, notificationId, false);
        }
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <NavThemeProvider value={resolvedScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="add-reminder"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
