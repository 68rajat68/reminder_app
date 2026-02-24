import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Pressable,
  Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Reminder } from "../types/reminder";
import { ThemeColors, Spacing, BorderRadius, FontSize } from "../constants/theme";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 7];

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, "0");
  return `${h}:${m} ${period}`;
}

function getDayLabel(days: number[]): string {
  if (days.length === 7) return "Every day";
  if (
    days.length === 5 &&
    [2, 3, 4, 5, 6].every((d) => days.includes(d))
  )
    return "Weekdays";
  if (
    days.length === 2 &&
    days.includes(1) &&
    days.includes(7)
  )
    return "Weekends";
  return days
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d - 1])
    .join(", ");
}

interface Props {
  reminder: Reminder;
  colors: ThemeColors;
  onToggle: (id: string, enabled: boolean) => void;
  onPress: (reminder: Reminder) => void;
  onDelete: (id: string) => void;
  index: number;
}

export default function ReminderCard({
  reminder,
  colors,
  onToggle,
  onPress,
  onDelete,
  index,
}: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 80,
        friction: 12,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 300,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handleToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(reminder.id, value);
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete(reminder.id);
  };

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onPress(reminder)}
        onLongPress={handleLongPress}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: reminder.enabled ? colors.primary + "30" : colors.border,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <View style={styles.cardContent}>
          <View style={styles.leftSection}>
            <Text
              style={[
                styles.time,
                {
                  color: reminder.enabled ? colors.text : colors.textMuted,
                },
              ]}
            >
              {formatTime(reminder.hour, reminder.minute)}
            </Text>
            <Text
              style={[
                styles.message,
                {
                  color: reminder.enabled
                    ? colors.textSecondary
                    : colors.textMuted,
                },
              ]}
              numberOfLines={2}
            >
              {reminder.message}
            </Text>
            <View style={styles.daysRow}>
              {DAY_VALUES.map((day, i) => {
                const isActive = reminder.days.includes(day);
                return (
                  <View
                    key={day}
                    style={[
                      styles.dayDot,
                      {
                        backgroundColor: isActive
                          ? reminder.enabled
                            ? colors.primary
                            : colors.textMuted
                          : "transparent",
                        borderColor: isActive
                          ? "transparent"
                          : reminder.enabled
                          ? colors.border
                          : colors.borderLight,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayDotText,
                        {
                          color: isActive
                            ? "#fff"
                            : reminder.enabled
                            ? colors.textMuted
                            : colors.borderLight,
                        },
                      ]}
                    >
                      {DAY_LABELS[i][0]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
          <View style={styles.rightSection}>
            <Switch
              value={reminder.enabled}
              onValueChange={handleToggle}
              trackColor={{
                false: colors.toggleTrackOff,
                true: colors.toggleTrackOn,
              }}
              thumbColor="#ffffff"
              ios_backgroundColor={colors.toggleTrackOff}
            />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
  },
  leftSection: {
    flex: 1,
    marginRight: Spacing.md,
  },
  rightSection: {
    alignItems: "center",
    justifyContent: "center",
  },
  time: {
    fontSize: FontSize.xxl,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  message: {
    fontSize: FontSize.md,
    marginTop: Spacing.xs,
    lineHeight: 20,
  },
  daysRow: {
    flexDirection: "row",
    marginTop: Spacing.sm,
    gap: 4,
  },
  dayDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  dayDotText: {
    fontSize: 10,
    fontWeight: "600",
  },
});
