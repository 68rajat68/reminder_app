import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeColors, Spacing, FontSize } from '../constants/theme';

interface Props {
  data: Record<string, number>;
  colors: ThemeColors;
  year: number;
  month: number;
}

export default function MonthlyHeatMap({ data, colors, year, month }: Props) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const monthName = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getColor = (day: number | null): string => {
    if (day === null) return 'transparent';
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const key = `${year}-${m}-${d}`;
    const ratio = data[key] ?? -1;
    if (ratio < 0) return colors.progressRingBg;
    if (ratio === 0) return colors.danger + '30';
    if (ratio < 1) return colors.primary + '60';
    return colors.primary;
  };

  return (
    <View>
      <Text style={[styles.monthTitle, { color: colors.text }]}>{monthName}</Text>
      <View style={styles.dayLabels}>
        {dayLabels.map((l, i) => (
          <Text key={i} style={[styles.dayLabel, { color: colors.textMuted }]}>{l}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, i) => (
          <View key={i} style={[styles.cell, { backgroundColor: getColor(day) }]}>
            {day !== null && (
              <Text style={[styles.cellText, {
                color: (data[`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`] ?? -1) >= 1 ? '#fff' : colors.textMuted,
              }]}>
                {day}
              </Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monthTitle: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.sm },
  dayLabels: { flexDirection: 'row', marginBottom: 4 },
  dayLabel: { flex: 1, textAlign: 'center', fontSize: FontSize.xs, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 6, marginBottom: 2 },
  cellText: { fontSize: FontSize.xs, fontWeight: '500' },
});
