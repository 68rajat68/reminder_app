import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { ThemeColors, Spacing, BorderRadius, FontSize } from "../constants/theme";

const DAYS = [
  { label: "S", value: 1 },
  { label: "M", value: 2 },
  { label: "T", value: 3 },
  { label: "W", value: 4 },
  { label: "T", value: 5 },
  { label: "F", value: 6 },
  { label: "S", value: 7 },
];

const WEEKDAYS = [2, 3, 4, 5, 6];
const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
const WEEKENDS = [1, 7];

interface Props {
  selectedDays: number[];
  onChange: (days: number[]) => void;
  colors: ThemeColors;
}

export default function DaySelector({ selectedDays, onChange, colors }: Props) {
  const toggleDay = (value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedDays.includes(value)) {
      const next = selectedDays.filter((d) => d !== value);
      if (next.length > 0) onChange(next);
    } else {
      onChange([...selectedDays, value].sort((a, b) => a - b));
    }
  };

  const selectPreset = (preset: number[]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(preset);
  };

  const isPresetActive = (preset: number[]) =>
    preset.length === selectedDays.length &&
    preset.every((d) => selectedDays.includes(d));

  return (
    <View>
      <View style={styles.daysRow}>
        {DAYS.map((day) => {
          const isSelected = selectedDays.includes(day.value);
          return (
            <Pressable
              key={day.value}
              onPress={() => toggleDay(day.value)}
              style={[
                styles.dayButton,
                {
                  backgroundColor: isSelected
                    ? colors.daySelected
                    : colors.dayUnselected,
                  borderColor: isSelected ? colors.daySelected : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  {
                    color: isSelected
                      ? colors.daySelectedText
                      : colors.dayUnselectedText,
                  },
                ]}
              >
                {day.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.presetsRow}>
        {[
          { label: "Every day", value: ALL_DAYS },
          { label: "Weekdays", value: WEEKDAYS },
          { label: "Weekends", value: WEEKENDS },
        ].map((preset) => {
          const active = isPresetActive(preset.value);
          return (
            <Pressable
              key={preset.label}
              onPress={() => selectPreset(preset.value)}
              style={[
                styles.presetButton,
                {
                  backgroundColor: active ? colors.primaryBg : colors.surface,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.presetText,
                  { color: active ? colors.primary : colors.textSecondary },
                ]}
              >
                {preset.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  dayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  dayText: {
    fontSize: FontSize.md,
    fontWeight: "700",
  },
  presetsRow: {
    flexDirection: "row",
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  presetButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  presetText: {
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
});
