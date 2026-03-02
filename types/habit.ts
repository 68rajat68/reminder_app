// types/habit.ts
export type CategoryType = 'health' | 'work' | 'personal' | 'fitness' | 'learning' | 'other';

export interface Habit {
  id: string;
  message: string;
  hour: number;       // 0-23
  minute: number;     // 0-59
  days: number[];     // 1=Sunday..7=Saturday (expo weekday format)
  enabled: boolean;
  notificationIds: string[];
  createdAt: number;
  category: CategoryType;
  icon: string;       // emoji
  streak: number;
  bestStreak: number;
}

export interface Completion {
  habitId: string;
  date: string;       // "YYYY-MM-DD"
  completed: boolean;
}

export const CATEGORIES: { type: CategoryType; label: string; defaultIcon: string }[] = [
  { type: 'health', label: 'Health', defaultIcon: '💊' },
  { type: 'fitness', label: 'Fitness', defaultIcon: '🏃' },
  { type: 'work', label: 'Work', defaultIcon: '💼' },
  { type: 'personal', label: 'Personal', defaultIcon: '🌟' },
  { type: 'learning', label: 'Learning', defaultIcon: '📚' },
  { type: 'other', label: 'Other', defaultIcon: '📌' },
];

export const CATEGORY_ICONS: Record<CategoryType, string[]> = {
  health:   ['💊', '💧', '🧘', '😴', '🍎', '🩺', '💉', '🫁'],
  fitness:  ['🏃', '🏋️', '🚴', '🧗', '⚽', '🏊', '🤸', '🚶'],
  work:     ['💼', '💻', '📧', '📊', '📝', '🗂️', '📞', '🎯'],
  personal: ['🌟', '🧹', '🛒', '👨‍👩‍👧', '🐕', '🪴', '📖', '✍️'],
  learning: ['📚', '🎓', '🧠', '📐', '🔬', '🎨', '🎵', '🌍'],
  other:    ['📌', '⏰', '🔔', '📋', '🗓️', '✅', '🎒', '🏠'],
};
