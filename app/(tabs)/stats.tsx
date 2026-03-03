import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useAppTheme } from '../../hooks/use-app-theme';
import { getAllHabits, getCompletionsInRange } from '../../services/database';
import { Habit } from '../../types/habit';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import WeeklyBarChart from '../../components/WeeklyBarChart';
import MonthlyHeatMap from '../../components/MonthlyHeatMap';

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getExpoWeekday(date: Date): number {
  return date.getDay() + 1;
}

export default function StatsScreen() {
  const colors = useAppTheme();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ day: string; count: number; total: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<Record<string, number>>({});
  // Fix #12: Track current year/month in state so it's always fresh
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());

  // Fix #12: loadStats uses fresh Date inside, not a stale outer `now`
  const loadStats = useCallback(async () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());

    const allHabits = await getAllHabits();
    setHabits(allHabits);

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekCompletions = await getCompletionsInRange(formatDate(weekStart), formatDate(weekEnd));
    const completedMap = new Map<string, Set<string>>();
    for (const c of weekCompletions) {
      if (c.completed) {
        if (!completedMap.has(c.date)) completedMap.set(c.date, new Set());
        completedMap.get(c.date)!.add(c.habitId);
      }
    }

    const weekly = dayLabels.map((label, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = formatDate(date);
      const weekday = getExpoWeekday(date);
      const scheduledHabits = allHabits.filter(h => h.enabled && h.days.includes(weekday));
      const completed = completedMap.get(dateStr)?.size ?? 0;
      return { day: label.substring(0, 3), count: Math.min(completed, scheduledHabits.length), total: scheduledHabits.length };
    });
    setWeeklyData(weekly);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthCompletions = await getCompletionsInRange(formatDate(monthStart), formatDate(monthEnd));

    const monthMap: Record<string, Set<string>> = {};
    for (const c of monthCompletions) {
      if (c.completed) {
        if (!monthMap[c.date]) monthMap[c.date] = new Set();
        monthMap[c.date].add(c.habitId);
      }
    }

    const heatData: Record<string, number> = {};
    for (let d = 1; d <= monthEnd.getDate(); d++) {
      const date = new Date(now.getFullYear(), now.getMonth(), d);
      const dateStr = formatDate(date);
      const weekday = getExpoWeekday(date);
      const scheduled = allHabits.filter(h => h.enabled && h.days.includes(weekday)).length;
      if (scheduled > 0) {
        const completed = monthMap[dateStr]?.size ?? 0;
        heatData[dateStr] = completed / scheduled;
      }
    }
    setMonthlyData(heatData);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const bestStreak = habits.reduce((max, h) => Math.max(max, h.bestStreak), 0);
  const activeStreaks = habits.filter(h => h.streak > 0).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Statistics</Text>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>{activeStreaks}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Active{'\n'}Streaks</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryValue, { color: colors.streakFire }]}>🔥 {bestStreak}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Best{'\n'}Streak</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryValue, { color: colors.success }]}>{habits.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total{'\n'}Habits</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>THIS WEEK</Text>
          <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <WeeklyBarChart data={weeklyData} colors={colors} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>THIS MONTH</Text>
          <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MonthlyHeatMap data={monthlyData} colors={colors} year={currentYear} month={currentMonth} />
          </View>
        </View>

        {habits.filter(h => h.streak > 0).length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>STREAK LEADERS</Text>
            {habits.filter(h => h.streak > 0).sort((a, b) => b.streak - a.streak).map(h => (
              <View key={h.id} style={[styles.streakRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={styles.streakIcon}>{h.icon}</Text>
                <View style={styles.streakInfo}>
                  <Text style={[styles.streakName, { color: colors.text }]} numberOfLines={1}>{h.message}</Text>
                  <Text style={[styles.streakSub, { color: colors.textMuted }]}>Best: {h.bestStreak} days</Text>
                </View>
                <View style={[styles.streakBadge, { backgroundColor: colors.streakFire + '15' }]}>
                  <Text style={[styles.streakBadgeText, { color: colors.streakFire }]}>🔥 {h.streak}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.xl, paddingBottom: 120 },
  title: { fontSize: FontSize.hero, fontWeight: '800', letterSpacing: -0.5, marginBottom: Spacing.xxl },
  summaryRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xxl },
  summaryCard: { flex: 1, alignItems: 'center', padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1 },
  summaryValue: { fontSize: FontSize.xl, fontWeight: '800', marginBottom: 4 },
  summaryLabel: { fontSize: FontSize.xs, fontWeight: '500', textAlign: 'center', lineHeight: 15 },
  section: { marginBottom: Spacing.xxl },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1, marginBottom: Spacing.sm, marginLeft: Spacing.xs },
  chartCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg },
  streakRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1, marginBottom: Spacing.sm },
  streakIcon: { fontSize: 24, marginRight: Spacing.md },
  streakInfo: { flex: 1 },
  streakName: { fontSize: FontSize.md, fontWeight: '600' },
  streakSub: { fontSize: FontSize.xs, marginTop: 2 },
  streakBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  streakBadgeText: { fontSize: FontSize.sm, fontWeight: '700' },
});
