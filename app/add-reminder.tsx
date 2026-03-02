import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable, ScrollView,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks/use-app-theme';
import { Habit, CategoryType, CATEGORIES } from '../types/habit';
import { getHabitById, insertHabit, updateHabit as updateHabitDb } from '../services/database';
import { scheduleReminder, cancelReminder } from '../services/notifications';
import { Spacing, BorderRadius, FontSize } from '../constants/theme';
import DaySelector from '../components/DaySelector';
import CategoryPicker from '../components/CategoryPicker';
import IconPicker from '../components/IconPicker';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export default function AddReminderScreen() {
  const colors = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!params.id;

  const [message, setMessage] = useState('');
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [category, setCategory] = useState<CategoryType>('other');
  const [icon, setIcon] = useState('📌');
  const [existingHabit, setExistingHabit] = useState<Habit | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(Platform.OS === 'ios');

  useEffect(() => {
    if (params.id) {
      getHabitById(params.id).then(found => {
        if (found) {
          setMessage(found.message);
          setHour(found.hour);
          setMinute(found.minute);
          setDays(found.days);
          setCategory(found.category);
          setIcon(found.icon);
          setExistingHabit(found);
        }
      });
    }
  }, [params.id]);

  const handleCategoryChange = (newCategory: CategoryType) => {
    setCategory(newCategory);
    const cat = CATEGORIES.find(c => c.type === newCategory);
    if (cat) setIcon(cat.defaultIcon);
  };

  const timeDate = new Date();
  timeDate.setHours(hour, minute, 0, 0);

  const handleTimeChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (selectedDate) {
      setHour(selectedDate.getHours());
      setMinute(selectedDate.getMinutes());
    }
  };

  const formatTime = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const handleSave = async () => {
    if (!message.trim()) {
      Alert.alert('Missing message', 'Please enter a habit message.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (isEditing && existingHabit) {
      await cancelReminder(existingHabit.notificationIds);

      const updated: Habit = {
        ...existingHabit,
        message: message.trim(),
        hour,
        minute,
        days,
        category,
        icon,
      };

      const newIds = await scheduleReminder(updated);
      updated.notificationIds = newIds;
      await updateHabitDb(updated);
    } else {
      const newHabit: Habit = {
        id: generateId(),
        message: message.trim(),
        hour,
        minute,
        days,
        enabled: true,
        notificationIds: [],
        createdAt: Date.now(),
        category,
        icon,
        streak: 0,
        bestStreak: 0,
      };

      const newIds = await scheduleReminder(newHabit);
      newHabit.notificationIds = newIds;
      await insertHabit(newHabit);
    }

    router.back();
  };

  const canSave = message.trim().length > 0 && days.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: colors.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditing ? 'Edit Habit' : 'New Habit'}
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={[styles.saveButton, { backgroundColor: canSave ? colors.primary : colors.border }]}
          >
            <Text style={[styles.saveButtonText, { color: canSave ? '#fff' : colors.textMuted }]}>Save</Text>
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
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>MESSAGE</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="What habit do you want to build?"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={200}
                style={[styles.textInput, { color: colors.text }]}
              />
              <Text style={[styles.charCount, { color: colors.textMuted }]}>{message.length}/200</Text>
            </View>
          </View>

          {/* Category Picker */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CATEGORY</Text>
            <CategoryPicker selected={category} onChange={handleCategoryChange} colors={colors} />
          </View>

          {/* Icon Picker */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ICON</Text>
            <View style={[styles.pickerBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconPicker category={category} selected={icon} onChange={setIcon} colors={colors} />
            </View>
          </View>

          {/* Time Picker */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TIME</Text>
            {Platform.OS === 'android' && (
              <Pressable
                onPress={() => setShowTimePicker(true)}
                style={[styles.timeDisplay, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.timeText, { color: colors.primary }]}>{formatTime(hour, minute)}</Text>
                <Text style={[styles.tapHint, { color: colors.textMuted }]}>Tap to change</Text>
              </Pressable>
            )}
            {showTimePicker && (
              <View style={[styles.timePickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <DateTimePicker
                  value={timeDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleTimeChange}
                  themeVariant={colors.background === '#0f0f1a' ? 'dark' : 'light'}
                />
              </View>
            )}
          </View>

          {/* Day Selector */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>REPEAT</Text>
            <View style={[styles.dayContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <DaySelector selectedDays={days} onChange={setDays} colors={colors} />
            </View>
          </View>

          {/* Preview */}
          <View style={[styles.previewCard, { backgroundColor: colors.primaryBg, borderColor: colors.primary + '30' }]}>
            <Text style={[styles.previewLabel, { color: colors.primary }]}>Preview</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewIcon}>{icon}</Text>
              <Text style={[styles.previewTime, { color: colors.text }]}>{formatTime(hour, minute)}</Text>
            </View>
            <Text style={[styles.previewMessage, { color: colors.textSecondary }]}>
              {message.trim() || 'Your habit message'}
            </Text>
            <Text style={[styles.previewDays, { color: colors.textMuted }]}>
              {days.length === 7
                ? 'Every day'
                : days.length === 5 && [2, 3, 4, 5, 6].every(d => days.includes(d))
                ? 'Weekdays'
                : days.length === 2 && days.includes(1) && days.includes(7)
                ? 'Weekends'
                : days.sort((a, b) => a - b).map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d - 1]).join(', ')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  headerButton: { paddingVertical: Spacing.sm, paddingRight: Spacing.md },
  headerButtonText: { fontSize: FontSize.lg, fontWeight: '500' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  saveButton: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.full },
  saveButtonText: { fontSize: FontSize.md, fontWeight: '700' },
  scrollContent: { padding: Spacing.xl, paddingBottom: 50 },
  section: { marginBottom: Spacing.xxl },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1, marginBottom: Spacing.sm, marginLeft: Spacing.xs },
  inputContainer: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg },
  textInput: { fontSize: FontSize.lg, minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontSize: FontSize.xs, textAlign: 'right', marginTop: Spacing.sm },
  pickerBox: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg },
  timeDisplay: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.xl, alignItems: 'center' },
  timeText: { fontSize: 42, fontWeight: '700', letterSpacing: -1 },
  tapHint: { fontSize: FontSize.sm, marginTop: Spacing.xs },
  timePickerContainer: { borderRadius: BorderRadius.lg, borderWidth: 1, overflow: 'hidden' },
  dayContainer: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg },
  previewCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.xl, marginTop: Spacing.sm },
  previewLabel: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1, marginBottom: Spacing.sm },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewIcon: { fontSize: 24 },
  previewTime: { fontSize: FontSize.xxl, fontWeight: '800', letterSpacing: -0.5 },
  previewMessage: { fontSize: FontSize.md, marginTop: Spacing.xs },
  previewDays: { fontSize: FontSize.sm, marginTop: Spacing.xs },
});
