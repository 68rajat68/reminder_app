import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, Pressable, Animated, RefreshControl,
  AppState, useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../../hooks/use-app-theme';
import { Habit } from '../../types/habit';
import { getAllHabits, getCompletionsForDate, toggleCompletion, deleteHabit as deleteHabitDb, updateHabit } from '../../services/database';
import { scheduleReminder, cancelReminder } from '../../services/notifications';
import { updateStreakForHabit, getTodayString, getStreakMilestone } from '../../services/streaks';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';
import { appLog } from '../../services/logger';
import HabitCard from '../../components/HabitCard';
import EmptyState from '../../components/EmptyState';
import Toast from '../../components/Toast';
import ProgressRing from '../../components/ProgressRing';
import Confetti from '../../components/Confetti';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getExpoWeekday(): number {
  return new Date().getDay() + 1;
}

export default function TodayScreen() {
  const colors = useAppTheme();
  const router = useRouter();
  // Fix #11: Use useWindowDimensions for responsive ring size
  const { width: screenWidth } = useWindowDimensions();
  const ringSize = Math.min(screenWidth * 0.35, 160);

  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const fabScale = useRef(new Animated.Value(1)).current;
  // Fix #15: Track last-known date for rollover detection
  const lastDateRef = useRef(getTodayString());

  const todayStr = getTodayString();
  const todayWeekday = getExpoWeekday();

  const loadData = useCallback(async () => {
    const allHabits = await getAllHabits();
    const todayCompletions = await getCompletionsForDate(todayStr);
    const completedSet = new Set(todayCompletions.filter(c => c.completed).map(c => c.habitId));
    setHabits(allHabits);
    setCompletedIds(completedSet);
    return { allHabits, completedSet };
  }, [todayStr]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Fix #15: Reload data when app comes to foreground (handles midnight rollover)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const currentDate = getTodayString();
        if (currentDate !== lastDateRef.current) {
          appLog.dateRollover(lastDateRef.current, currentDate);
          lastDateRef.current = currentDate;
        }
        appLog.foregroundReload();
        loadData();
      }
    });
    return () => subscription.remove();
  }, [loadData]);

  const todaysHabits = habits.filter(h => h.enabled && h.days.includes(todayWeekday));
  const completedCount = todaysHabits.filter(h => completedIds.has(h.id)).length;
  const totalCount = todaysHabits.length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  // Fix #9: Check h.enabled so disabled habits don't appear in pending/done
  const pendingHabits = habits.filter(h => h.enabled && h.days.includes(todayWeekday) && !completedIds.has(h.id));
  const doneHabits = habits.filter(h => h.enabled && h.days.includes(todayWeekday) && completedIds.has(h.id));
  const disabledTodayHabits = habits.filter(h => !h.enabled && h.days.includes(todayWeekday));
  const otherHabits = habits.filter(h => !h.days.includes(todayWeekday));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleComplete = async (id: string) => {
    const isCompleted = completedIds.has(id);
    const newCompleted = new Set(completedIds);

    if (isCompleted) {
      newCompleted.delete(id);
    } else {
      newCompleted.add(id);
    }
    setCompletedIds(newCompleted);

    await toggleCompletion(id, todayStr, !isCompleted);

    const habit = habits.find(h => h.id === id);
    if (habit) {
      const updated = await updateStreakForHabit(habit);
      setHabits(prev => prev.map(h => h.id === id ? updated : h));

      if (!isCompleted) {
        const milestone = getStreakMilestone(updated.streak);
        if (milestone && (updated.streak === 3 || updated.streak === 7 || updated.streak === 30 || updated.streak === 100)) {
          setToastMessage(`🏆 ${milestone}! ${updated.streak} day streak!`);
          setToastVisible(true);
        }

        const newCompletedCount = todaysHabits.filter(h => newCompleted.has(h.id)).length;
        if (newCompletedCount === totalCount && totalCount > 0) {
          setShowConfetti(true);
          setToastMessage('🎉 All habits completed today!');
          setToastVisible(true);
        }
      }
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    const updated = { ...habit, enabled };
    setHabits(prev => prev.map(h => h.id === id ? updated : h));
    await updateHabit(updated);

    const newIds = await scheduleReminder(updated);
    const final = { ...updated, notificationIds: newIds };
    setHabits(prev => prev.map(h => h.id === id ? final : h));
    await updateHabit(final);
  };

  const handleDelete = async (id: string) => {
    const habit = habits.find(h => h.id === id);
    if (habit) {
      await cancelReminder(habit.notificationIds);
    }
    await deleteHabitDb(id);
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  const handlePress = (habit: Habit) => {
    router.push({ pathname: '/add-reminder', params: { id: habit.id } });
  };

  const handleFabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/add-reminder');
  };

  const handleFabPressIn = () => {
    Animated.spring(fabScale, { toValue: 0.9, tension: 300, friction: 10, useNativeDriver: true }).start();
  };

  const handleFabPressOut = () => {
    Animated.spring(fabScale, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }).start();
  };

  const topStreaks = [...habits].filter(h => h.streak > 0).sort((a, b) => b.streak - a.streak).slice(0, 3);

  const allData = [
    ...pendingHabits.map(h => ({ ...h, _section: 'pending' as const })),
    ...doneHabits.map(h => ({ ...h, _section: 'done' as const })),
    ...disabledTodayHabits.map(h => ({ ...h, _section: 'paused' as const })),
    ...otherHabits.map(h => ({ ...h, _section: 'other' as const })),
  ];

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            {getGreeting()} 👋
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>My Habits</Text>
          {topStreaks.length > 0 && (
            <View style={styles.streakRow}>
              {topStreaks.map(h => (
                <View key={h.id} style={[styles.streakChip, { backgroundColor: colors.streakFire + '15' }]}>
                  <Text style={styles.streakChipText}>{h.icon} 🔥{h.streak}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        {totalCount > 0 && (
          <View style={styles.ringContainer}>
            <ProgressRing
              size={ringSize}
              strokeWidth={10}
              progress={progress}
              color={colors.primary}
              bgColor={colors.progressRingBg}
            >
              <Text style={[styles.ringText, { color: colors.text }]}>{completedCount}/{totalCount}</Text>
              <Text style={[styles.ringLabel, { color: colors.textMuted }]}>done</Text>
            </ProgressRing>
          </View>
        )}
      </View>

      {pendingHabits.length > 0 && (
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>TO DO</Text>
      )}
    </View>
  );

  const renderItem = ({ item, index }: { item: Habit & { _section: string }; index: number }) => {
    const showDoneHeader = item._section === 'done' && index === pendingHabits.length;
    const showPausedHeader = item._section === 'paused' && index === pendingHabits.length + doneHabits.length;
    const showOtherHeader = item._section === 'other' && index === pendingHabits.length + doneHabits.length + disabledTodayHabits.length;

    return (
      <View>
        {showDoneHeader && doneHabits.length > 0 && (
          <Text style={[styles.sectionHeader, { color: colors.success }]}>COMPLETED ✓</Text>
        )}
        {showPausedHeader && disabledTodayHabits.length > 0 && (
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>PAUSED</Text>
        )}
        {showOtherHeader && otherHabits.length > 0 && (
          <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>OTHER DAYS</Text>
        )}
        <HabitCard
          habit={item}
          colors={colors}
          isCompletedToday={completedIds.has(item.id)}
          onToggle={handleToggle}
          onPress={handlePress}
          onDelete={handleDelete}
          onComplete={handleComplete}
          index={index}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {habits.length === 0 ? (
        <>
          {renderHeader()}
          <EmptyState colors={colors} />
        </>
      ) : (
        <FlatList
          data={allData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        />
      )}

      <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}>
        <Pressable
          onPress={handleFabPress}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          style={[styles.fab, { backgroundColor: colors.fab, shadowColor: colors.fabShadow }]}
        >
          <Text style={styles.fabIcon}>+</Text>
        </Pressable>
      </Animated.View>

      <Toast message={toastMessage} visible={toastVisible} onHide={() => setToastVisible(false)} />
      <Confetti visible={showConfetti} onComplete={() => setShowConfetti(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  headerLeft: { flex: 1 },
  greeting: { fontSize: FontSize.md, fontWeight: '500', marginBottom: 2 },
  title: { fontSize: FontSize.hero, fontWeight: '800', letterSpacing: -0.5 },
  streakRow: { flexDirection: 'row', marginTop: Spacing.sm, gap: 6, flexWrap: 'wrap' },
  streakChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  streakChipText: { fontSize: FontSize.xs, fontWeight: '600' },
  ringContainer: { marginLeft: Spacing.md },
  ringText: { fontSize: FontSize.xl, fontWeight: '800' },
  ringLabel: { fontSize: FontSize.xs, fontWeight: '500' },
  sectionHeader: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1, paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  list: { paddingBottom: 120 },
  fabContainer: { position: 'absolute', bottom: 30, right: 20 },
  fab: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.8, shadowRadius: 12, elevation: 8 },
  fabIcon: { fontSize: 32, color: '#ffffff', fontWeight: '300', marginTop: -2 },
});
