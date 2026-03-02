import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, Switch, Pressable, Animated,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Habit } from '../types/habit';
import { ThemeColors, Spacing, BorderRadius, FontSize } from '../constants/theme';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 7];

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  return `${h}:${m} ${period}`;
}

interface Props {
  habit: Habit;
  colors: ThemeColors;
  isCompletedToday: boolean;
  onToggle: (id: string, enabled: boolean) => void;
  onPress: (habit: Habit) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  index: number;
}

export default function HabitCard({
  habit, colors, isCompletedToday, onToggle, onPress, onDelete, onComplete, index,
}: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const swipeableRef = useRef<Swipeable>(null);
  const checkAnim = useRef(new Animated.Value(isCompletedToday ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  React.useEffect(() => {
    Animated.spring(checkAnim, {
      toValue: isCompletedToday ? 1 : 0,
      tension: 200,
      friction: 15,
      useNativeDriver: true,
    }).start();
  }, [isCompletedToday]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, tension: 300, friction: 10, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, tension: 300, friction: 10, useNativeDriver: true }).start();
  };

  const handleCheckPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete(habit.id);
  };

  const handleToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(habit.id, value);
  };

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({ inputRange: [-100, -50, 0], outputRange: [1, 0.8, 0], extrapolate: 'clamp' });
    const opacity = dragX.interpolate({ inputRange: [-100, -50, 0], outputRange: [1, 0.8, 0], extrapolate: 'clamp' });
    return (
      <Animated.View style={[styles.deleteAction, { backgroundColor: colors.danger, opacity }]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Text style={styles.deleteIcon}>🗑️</Text>
          <Text style={styles.deleteText}>Delete</Text>
        </Animated.View>
      </Animated.View>
    );
  };

  const renderLeftActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({ inputRange: [0, 50, 100], outputRange: [0, 0.8, 1], extrapolate: 'clamp' });
    const opacity = dragX.interpolate({ inputRange: [0, 50, 100], outputRange: [0, 0.8, 1], extrapolate: 'clamp' });
    return (
      <Animated.View style={[styles.deleteActionLeft, { backgroundColor: colors.danger, opacity }]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Text style={styles.deleteIcon}>🗑️</Text>
          <Text style={styles.deleteText}>Delete</Text>
        </Animated.View>
      </Animated.View>
    );
  };

  const handleSwipeOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    swipeableRef.current?.close();
    onDelete(habit.id);
  };

  const checkScale = checkAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });

  return (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        onSwipeableOpen={handleSwipeOpen}
        overshootRight={false}
        overshootLeft={false}
        friction={2}
        rightThreshold={80}
        leftThreshold={80}
        containerStyle={styles.swipeContainer}
      >
        <Pressable
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => onPress(habit)}
          style={[styles.card, {
            backgroundColor: colors.surface,
            borderColor: habit.enabled ? colors.primary + '30' : colors.border,
            shadowColor: colors.shadow,
            opacity: isCompletedToday ? 0.7 : 1,
          }]}
        >
          <View style={styles.cardContent}>
            <Pressable onPress={handleCheckPress} style={styles.checkboxContainer}>
              <Animated.View style={[styles.checkbox, {
                backgroundColor: isCompletedToday ? colors.primary : 'transparent',
                borderColor: isCompletedToday ? colors.primary : colors.border,
                transform: [{ scale: checkScale }],
              }]}>
                {isCompletedToday && <Text style={styles.checkmark}>✓</Text>}
              </Animated.View>
            </Pressable>

            <View style={styles.centerSection}>
              <View style={styles.topRow}>
                <Text style={styles.habitIcon}>{habit.icon}</Text>
                <Text style={[styles.time, {
                  color: habit.enabled ? colors.text : colors.textMuted,
                  textDecorationLine: isCompletedToday ? 'line-through' : 'none',
                }]}>
                  {formatTime(habit.hour, habit.minute)}
                </Text>
                {habit.streak > 0 && (
                  <View style={[styles.streakBadge, { backgroundColor: colors.streakFire + '20' }]}>
                    <Text style={styles.streakText}>🔥 {habit.streak}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[styles.message, {
                  color: habit.enabled ? colors.textSecondary : colors.textMuted,
                  textDecorationLine: isCompletedToday ? 'line-through' : 'none',
                }]}
                numberOfLines={2}
              >
                {habit.message}
              </Text>
              <View style={styles.daysRow}>
                {DAY_VALUES.map((day, i) => {
                  const isActive = habit.days.includes(day);
                  return (
                    <View key={day} style={[styles.dayDot, {
                      backgroundColor: isActive ? (habit.enabled ? colors.primary : colors.textMuted) : 'transparent',
                      borderColor: isActive ? 'transparent' : (habit.enabled ? colors.border : colors.borderLight),
                    }]}>
                      <Text style={[styles.dayDotText, {
                        color: isActive ? '#fff' : (habit.enabled ? colors.textMuted : colors.borderLight),
                      }]}>
                        {DAY_LABELS[i][0]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.rightSection}>
              <Switch
                value={habit.enabled}
                onValueChange={handleToggle}
                trackColor={{ false: colors.toggleTrackOff, true: colors.toggleTrackOn }}
                thumbColor="#ffffff"
                ios_backgroundColor={colors.toggleTrackOff}
              />
            </View>
          </View>
        </Pressable>
      </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  card: { borderRadius: BorderRadius.lg, borderWidth: 1, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  cardContent: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg },
  checkboxContainer: { marginRight: Spacing.md, padding: 4 },
  checkbox: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: -1 },
  centerSection: { flex: 1, marginRight: Spacing.md },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  habitIcon: { fontSize: 18 },
  time: { fontSize: FontSize.xl, fontWeight: '700', letterSpacing: -0.5 },
  streakBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: BorderRadius.full, marginLeft: 4 },
  streakText: { fontSize: FontSize.xs, fontWeight: '700' },
  message: { fontSize: FontSize.md, marginTop: Spacing.xs, lineHeight: 20 },
  daysRow: { flexDirection: 'row', marginTop: Spacing.sm, gap: 4 },
  dayDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  dayDotText: { fontSize: 10, fontWeight: '600' },
  rightSection: { alignItems: 'center', justifyContent: 'center' },
  deleteAction: { justifyContent: 'center', alignItems: 'center', width: 90, borderTopRightRadius: BorderRadius.lg, borderBottomRightRadius: BorderRadius.lg },
  deleteActionLeft: { justifyContent: 'center', alignItems: 'center', width: 90, borderTopLeftRadius: BorderRadius.lg, borderBottomLeftRadius: BorderRadius.lg },
  deleteIcon: { fontSize: 22, textAlign: 'center' },
  deleteText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700', marginTop: 2, textAlign: 'center' },
});
