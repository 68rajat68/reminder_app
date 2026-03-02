import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { setupNotifications, requestPermissions } from '../services/notifications';
import { migrateIfNeeded } from '../services/migration';
import { getAllHabits, toggleCompletion } from '../services/database';
import { scheduleReminder, cancelAllReminders } from '../services/notifications';
import { updateStreakForHabit, getTodayString } from '../services/streaks';

function AppContent() {
  const { resolvedScheme } = useTheme();

  useEffect(() => {
    async function init() {
      await migrateIfNeeded();
      await setupNotifications();
      await requestPermissions();

      // Re-sync all notifications on launch
      const habits = await getAllHabits();
      await cancelAllReminders();
      for (const h of habits) {
        if (h.enabled) {
          await scheduleReminder(h);
        }
        // Recalculate streaks on launch
        await updateStreakForHabit(h);
      }
    }
    init();

    // Listen for notification quick actions
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      if (response.actionIdentifier === 'MARK_DONE') {
        const habitId = response.notification.request.identifier;
        // Find the habit by checking all habits — notification ID maps to scheduled notification
        const allHabits = await getAllHabits();
        for (const habit of allHabits) {
          if (habit.notificationIds.includes(response.notification.request.identifier)) {
            await toggleCompletion(habit.id, getTodayString(), true);
            await updateStreakForHabit(habit);
            break;
          }
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
