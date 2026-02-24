import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useColorScheme,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import { Reminder } from "../types/reminder";
import { loadReminders, saveReminders } from "../services/storage";
import { scheduleReminder, cancelReminder } from "../services/notifications";
import { useThemeColors, Spacing, BorderRadius, FontSize } from "../constants/theme";
import DaySelector from "../components/DaySelector";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export default function AddReminderScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!params.id;

  const [message, setMessage] = useState("");
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [existingReminder, setExistingReminder] = useState<Reminder | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === "ios");

  useEffect(() => {
    if (params.id) {
      loadReminders().then((reminders) => {
        const found = reminders.find((r) => r.id === params.id);
        if (found) {
          setMessage(found.message);
          setHour(found.hour);
          setMinute(found.minute);
          setDays(found.days);
          setExistingReminder(found);
        }
      });
    }
  }, [params.id]);

  const timeDate = new Date();
  timeDate.setHours(hour, minute, 0, 0);

  const handleTimeChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      setHour(selectedDate.getHours());
      setMinute(selectedDate.getMinutes());
    }
  };

  const formatTime = (h: number, m: number) => {
    const period = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 || 12;
    return `${displayHour}:${m.toString().padStart(2, "0")} ${period}`;
  };

  const handleSave = async () => {
    if (!message.trim()) {
      Alert.alert("Missing message", "Please enter a reminder message.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const allReminders = await loadReminders();

    if (isEditing && existingReminder) {
      // Cancel old notifications
      await cancelReminder(existingReminder.notificationIds);

      const updated: Reminder = {
        ...existingReminder,
        message: message.trim(),
        hour,
        minute,
        days,
      };

      const newIds = await scheduleReminder(updated);
      updated.notificationIds = newIds;

      const newList = allReminders.map((r) =>
        r.id === updated.id ? updated : r
      );
      await saveReminders(newList);
    } else {
      const newReminder: Reminder = {
        id: generateId(),
        message: message.trim(),
        hour,
        minute,
        days,
        enabled: true,
        notificationIds: [],
        createdAt: Date.now(),
      };

      const newIds = await scheduleReminder(newReminder);
      newReminder.notificationIds = newIds;

      await saveReminders([...allReminders, newReminder]);
    }

    router.back();
  };

  const canSave = message.trim().length > 0 && days.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: colors.textSecondary }]}>
              Cancel
            </Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditing ? "Edit Reminder" : "New Reminder"}
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={[
              styles.saveButton,
              {
                backgroundColor: canSave ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.saveButtonText,
                { color: canSave ? "#fff" : colors.textMuted },
              ]}
            >
              Save
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Message Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              MESSAGE
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="What do you want to be reminded about?"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={200}
                style={[
                  styles.textInput,
                  { color: colors.text },
                ]}
              />
              <Text style={[styles.charCount, { color: colors.textMuted }]}>
                {message.length}/200
              </Text>
            </View>
          </View>

          {/* Time Picker */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              TIME
            </Text>
            {Platform.OS === "android" && (
              <Pressable
                onPress={() => setShowTimePicker(true)}
                style={[
                  styles.timeDisplay,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.timeText, { color: colors.primary }]}>
                  {formatTime(hour, minute)}
                </Text>
                <Text style={[styles.tapHint, { color: colors.textMuted }]}>
                  Tap to change
                </Text>
              </Pressable>
            )}
            {showTimePicker && (
              <View
                style={[
                  styles.pickerContainer,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <DateTimePicker
                  value={timeDate}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={handleTimeChange}
                  themeVariant={colorScheme === "dark" ? "dark" : "light"}
                />
              </View>
            )}
          </View>

          {/* Day Selector */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              REPEAT
            </Text>
            <View
              style={[
                styles.dayContainer,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <DaySelector
                selectedDays={days}
                onChange={setDays}
                colors={colors}
              />
            </View>
          </View>

          {/* Preview */}
          <View
            style={[
              styles.previewCard,
              {
                backgroundColor: colors.primaryBg,
                borderColor: colors.primary + "30",
              },
            ]}
          >
            <Text style={[styles.previewLabel, { color: colors.primary }]}>
              Preview
            </Text>
            <Text style={[styles.previewTime, { color: colors.text }]}>
              {formatTime(hour, minute)}
            </Text>
            <Text style={[styles.previewMessage, { color: colors.textSecondary }]}>
              {message.trim() || "Your reminder message"}
            </Text>
            <Text style={[styles.previewDays, { color: colors.textMuted }]}>
              {days.length === 7
                ? "Every day"
                : days.length === 5 && [2, 3, 4, 5, 6].every((d) => days.includes(d))
                ? "Weekdays"
                : days.length === 2 && days.includes(1) && days.includes(7)
                ? "Weekends"
                : days
                    .sort((a, b) => a - b)
                    .map(
                      (d) =>
                        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d - 1]
                    )
                    .join(", ")}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0,
  },
  headerButton: {
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.md,
  },
  headerButtonText: {
    fontSize: FontSize.lg,
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: "700",
  },
  saveButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.full,
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: "700",
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingBottom: 50,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  inputContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  textInput: {
    fontSize: FontSize.lg,
    minHeight: 80,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: FontSize.xs,
    textAlign: "right",
    marginTop: Spacing.sm,
  },
  timeDisplay: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: "center",
  },
  timeText: {
    fontSize: 42,
    fontWeight: "700",
    letterSpacing: -1,
  },
  tapHint: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  pickerContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  dayContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  previewCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    marginTop: Spacing.sm,
  },
  previewLabel: {
    fontSize: FontSize.xs,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  previewTime: {
    fontSize: FontSize.xxl,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  previewMessage: {
    fontSize: FontSize.md,
    marginTop: Spacing.xs,
  },
  previewDays: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
});
