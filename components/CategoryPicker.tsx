import React from 'react';
import { Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CategoryType, CATEGORIES } from '../types/habit';
import { ThemeColors, Spacing, BorderRadius, FontSize } from '../constants/theme';

interface Props {
  selected: CategoryType;
  onChange: (category: CategoryType) => void;
  colors: ThemeColors;
}

export default function CategoryPicker({ selected, onChange, colors }: Props) {
  const handlePress = (type: CategoryType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(type);
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {CATEGORIES.map(cat => {
        const isActive = selected === cat.type;
        return (
          <Pressable
            key={cat.type}
            onPress={() => handlePress(cat.type)}
            style={[styles.chip, {
              backgroundColor: isActive ? colors.primaryBg : colors.surface,
              borderColor: isActive ? colors.primary : colors.border,
            }]}
          >
            <Text style={styles.chipIcon}>{cat.defaultIcon}</Text>
            <Text style={[styles.chipLabel, { color: isActive ? colors.primary : colors.textSecondary }]}>
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: Spacing.xs, gap: Spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.full, borderWidth: 1.5, gap: 6 },
  chipIcon: { fontSize: 16 },
  chipLabel: { fontSize: FontSize.sm, fontWeight: '600' },
});
