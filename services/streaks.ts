// services/streaks.ts
import { Habit } from '../types/habit';
import { getCompletionsForHabit, updateHabit } from './database';

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Get the expo weekday (1=Sun..7=Sat) for a JS Date
function getExpoWeekday(date: Date): number {
  return date.getDay() + 1; // JS: 0=Sun..6=Sat → Expo: 1=Sun..7=Sat
}

function isScheduledDay(date: Date, days: number[]): boolean {
  return days.includes(getExpoWeekday(date));
}

export function getTodayString(): string {
  return formatDate(new Date());
}

/**
 * Calculate the current streak for a habit by walking backward from today.
 * Only counts scheduled days. Non-scheduled days are skipped (don't break streak).
 */
export async function calculateStreak(habit: Habit): Promise<{ streak: number; bestStreak: number }> {
  const completions = await getCompletionsForHabit(habit.id);
  const completedDates = new Set(completions.filter(c => c.completed).map(c => c.date));

  let streak = 0;
  const today = new Date();
  const date = new Date(today);

  // Check today first — if today is scheduled but not yet completed, start from yesterday
  if (isScheduledDay(date, habit.days) && !completedDates.has(formatDate(date))) {
    date.setDate(date.getDate() - 1);
  }

  // Walk backward
  for (let i = 0; i < 365; i++) {
    if (isScheduledDay(date, habit.days)) {
      if (completedDates.has(formatDate(date))) {
        streak++;
      } else {
        break;
      }
    }
    date.setDate(date.getDate() - 1);
  }

  const bestStreak = Math.max(streak, habit.bestStreak);
  return { streak, bestStreak };
}

/**
 * Recalculate and persist streak for a habit.
 */
export async function updateStreakForHabit(habit: Habit): Promise<Habit> {
  const { streak, bestStreak } = await calculateStreak(habit);
  const updated = { ...habit, streak, bestStreak };
  await updateHabit(updated);
  return updated;
}

/**
 * Get the milestone badge for a streak count, if any.
 */
export function getStreakMilestone(streak: number): string | null {
  if (streak >= 100) return 'Unstoppable';
  if (streak >= 30) return 'One month';
  if (streak >= 7) return 'One week';
  if (streak >= 3) return 'Getting started';
  return null;
}
