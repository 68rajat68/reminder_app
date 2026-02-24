import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Animated,
  Alert,
  RefreshControl,
  useColorScheme,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { Reminder } from "../types/reminder";
import { loadReminders, saveReminders } from "../services/storage";
import { scheduleReminder, cancelReminder } from "../services/notifications";
import { useThemeColors, Spacing, BorderRadius, FontSize } from "../constants/theme";
import ReminderCard from "../components/ReminderCard";
import EmptyState from "../components/EmptyState";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const fabScale = useRef(new Animated.Value(1)).current;

  const loadData = useCallback(async () => {
    const data = await loadReminders();
    data.sort((a, b) => {
      const aMin = a.hour * 60 + a.minute;
      const bMin = b.hour * 60 + b.minute;
      return aMin - bMin;
    });
    setReminders(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
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
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert("Delete Reminder", "Are you sure you want to delete this reminder?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          const reminder = reminders.find((r) => r.id === id);
          if (reminder) {
            await cancelReminder(reminder.notificationIds);
          }
          const updated = reminders.filter((r) => r.id !== id);
          setReminders(updated);
          await saveReminders(updated);
        },
      },
    ]);
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
    </SafeAreaView>
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
