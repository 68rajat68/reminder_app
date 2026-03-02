import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CategoryType, CATEGORY_ICONS } from '../types/habit';
import { ThemeColors, Spacing, BorderRadius } from '../constants/theme';

interface Props {
  category: CategoryType;
  selected: string;
  onChange: (icon: string) => void;
  colors: ThemeColors;
}

export default function IconPicker({ category, selected, onChange, colors }: Props) {
  const icons = CATEGORY_ICONS[category];

  return (
    <View style={styles.grid}>
      {icons.map(icon => {
        const isActive = selected === icon;
        return (
          <Pressable
            key={icon}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onChange(icon);
            }}
            style={[styles.iconButton, {
              backgroundColor: isActive ? colors.primaryBg : 'transparent',
              borderColor: isActive ? colors.primary : colors.border,
            }]}
          >
            <Text style={styles.iconText}>{icon}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  iconButton: { width: 44, height: 44, borderRadius: BorderRadius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 22 },
});
