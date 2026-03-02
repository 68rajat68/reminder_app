import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeColors, Spacing, FontSize } from '../constants/theme';

interface Props {
  data: { day: string; count: number; total: number }[];
  colors: ThemeColors;
}

export default function WeeklyBarChart({ data, colors }: Props) {
  return (
    <View style={styles.container}>
      {data.map((item, i) => {
        const height = item.total > 0 ? (item.count / item.total) * 100 : 0;
        return (
          <View key={i} style={styles.barColumn}>
            <View style={styles.barWrapper}>
              <View style={[styles.barBg, { backgroundColor: colors.progressRingBg }]}>
                <View style={[styles.barFill, {
                  backgroundColor: colors.primary,
                  height: `${height}%`,
                }]} />
              </View>
            </View>
            <Text style={[styles.label, { color: colors.textMuted }]}>{item.day}</Text>
            <Text style={[styles.value, { color: colors.textSecondary }]}>
              {item.total > 0 ? `${item.count}/${item.total}` : '-'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 160, paddingHorizontal: Spacing.sm },
  barColumn: { alignItems: 'center', flex: 1 },
  barWrapper: { height: 100, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  barBg: { width: 20, height: 100, borderRadius: 10, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 10 },
  label: { fontSize: FontSize.xs, fontWeight: '600', marginTop: 6 },
  value: { fontSize: 9, fontWeight: '500', marginTop: 2 },
});
