import { useEffect } from "react";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { setupNotifications, requestPermissions } from "../services/notifications";
import { loadReminders } from "../services/storage";
import { scheduleReminder, cancelAllReminders } from "../services/notifications";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    async function init() {
      await setupNotifications();
      await requestPermissions();

      // Re-sync all reminders on app launch (safety net)
      const reminders = await loadReminders();
      await cancelAllReminders();
      for (const r of reminders) {
        if (r.enabled) {
          await scheduleReminder(r);
        }
      }
    }
    init();
  }, []);

  const dark = colorScheme === "dark";

  return (
    <ThemeProvider value={dark ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen
          name="add-reminder"
          options={{
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
