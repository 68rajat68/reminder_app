import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Animated,
  RefreshControl,
  useColorScheme,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { Reminder } from "../types/reminder";
import { loadReminders, saveReminders } from "../services/storage";
import { scheduleReminder, cancelReminder } from "../services/notifications";
import { useThemeColors, Spacing, BorderRadius, FontSize } from "../constants/theme";
import ReminderCard from "../components/ReminderCard";
import EmptyState from "../components/EmptyState";
import Toast from "../components/Toast";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getTimeUntilText(hour: number, minute: number): string {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  const diffMs = target.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 1) return "less than a minute";
  if (diffMins < 60) return `${diffMins} min`;

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const fabScale = useRef(new Animated.Value(1)).current;
  const prevCountRef = useRef(0);

  const loadData = useCallback(async () => {
    const data = await loadReminders();
    data.sort((a, b) => {
      const aMin = a.hour * 60 + a.minute;
      const bMin = b.hour * 60 + b.minute;
      return aMin - bMin;
    });
    return data;
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData().then((data) => {
        // Detect if a new reminder was added
        if (prevCountRef.current > 0 && data.length > prevCountRef.current) {
          const newest = data.reduce((a, b) =>
            a.createdAt > b.createdAt ? a : b
          );
          if (newest.enabled) {
            const timeUntil = getTimeUntilText(newest.hour, newest.minute);
            setToastMessage(`Next notification in ${timeUntil}`);
            setToastVisible(true);
          }
        }
        prevCountRef.current = data.length;
        setReminders(data);
      });
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    const data = await loadData();
    prevCountRef.current = data.length;
    setReminders(data);
    setRefreshing(false);
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    const updated = reminders.map((r) => {
      if (r.id !== id) return r;
      return { ...r, enabled };
    });
    setReminders(updated);
    await saveReminders(updated);

    const reminder = updated.find((r) => r.id === id);
    if (reminder) {
      const newIds = await scheduleReminder(reminder);
      const final = updated.map((r) =>
        r.id === id ? { ...r, notificationIds: newIds } : r
      );
      setReminders(final);
      await saveReminders(final);

      if (enabled) {
        const timeUntil = getTimeUntilText(reminder.hour, reminder.minute);
        setToastMessage(`Next notification in ${timeUntil}`);
        setToastVisible(true);
      }
    }
  };

  const handleDelete = async (id: string) => {
    const reminder = reminders.find((r) => r.id === id);
    if (reminder) {
      await cancelReminder(reminder.notificationIds);
    }
    const updated = reminders.filter((r) => r.id !== id);
    prevCountRef.current = updated.length;
    setReminders(updated);
    await saveReminders(updated);
  };

  const handlePress = (reminder: Reminder) => {
    router.push({ pathname: "/add-reminder", params: { id: reminder.id } });
  };

  const handleFabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/add-reminder");
  };

  const handleFabPressIn = () => {
    Animated.spring(fabScale, {
      toValue: 0.9,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handleFabPressOut = () => {
    Animated.spring(fabScale, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const activeCount = reminders.filter((r) => r.enabled).length;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>
              {getGreeting()} 👋
            </Text>
            <Text style={[styles.title, { color: colors.text }]}>My Reminders</Text>
          </View>
          {reminders.length > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primaryBg }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>
                {activeCount} active
              </Text>
            </View>
          )}
        </View>

        {/* List */}
        {reminders.length === 0 ? (
          <EmptyState colors={colors} />
        ) : (
          <FlatList
            data={reminders}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <ReminderCard
                reminder={item}
                colors={colors}
                onToggle={handleToggle}
                onPress={handlePress}
                onDelete={handleDelete}
                index={index}
              />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
          />
        )}

        {/* FAB */}
        <Animated.View
          style={[
            styles.fabContainer,
            {
              transform: [{ scale: fabScale }],
            },
          ]}
        >
          <Pressable
            onPress={handleFabPress}
            onPressIn={handleFabPressIn}
            onPressOut={handleFabPressOut}
            style={[
              styles.fab,
              {
                backgroundColor: colors.fab,
                shadowColor: colors.fabShadow,
              },
            ]}
          >
            <Text style={styles.fabIcon}>+</Text>
          </Pressable>
        </Animated.View>

        {/* Toast */}
        <Toast
          message={toastMessage}
          visible={toastVisible}
          onHide={() => setToastVisible(false)}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  greeting: {
    fontSize: FontSize.md,
    fontWeight: "500",
    marginBottom: 2,
  },
  title: {
    fontSize: FontSize.hero,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSize.sm,
    fontWeight: "700",
  },
  list: {
    paddingBottom: 100,
    paddingTop: Spacing.sm,
  },
  fabContainer: {
    position: "absolute",
    bottom: 30,
    right: 20,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: "#ffffff",
    fontWeight: "300",
    marginTop: -2,
  },
});
