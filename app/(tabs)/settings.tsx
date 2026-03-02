import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../hooks/use-app-theme';
import { useTheme, ACCENT_COLORS, ThemeMode } from '../../contexts/ThemeContext';
import { Spacing, BorderRadius, FontSize } from '../../constants/theme';

const THEME_OPTIONS: { label: string; value: ThemeMode; icon: string }[] = [
  { label: 'Light', value: 'light', icon: '☀️' },
  { label: 'Dark', value: 'dark', icon: '🌙' },
  { label: 'System', value: 'system', icon: '📱' },
];

export default function SettingsScreen() {
  const colors = useAppTheme();
  const { mode, accentColor, setMode, setAccentColor } = useTheme();

  const handleModeChange = (newMode: ThemeMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(newMode);
  };

  const handleAccentChange = (color: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAccentColor(color);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>APPEARANCE</Text>
          <View style={[styles.segmentedControl, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {THEME_OPTIONS.map(option => {
              const isActive = mode === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => handleModeChange(option.value)}
                  style={[styles.segment, isActive && { backgroundColor: colors.primaryBg }]}
                >
                  <Text style={styles.segmentIcon}>{option.icon}</Text>
                  <Text style={[styles.segmentLabel, { color: isActive ? colors.primary : colors.textSecondary }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ACCENT COLOR</Text>
          <View style={[styles.colorGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {ACCENT_COLORS.map(color => {
              const isActive = accentColor === color.value;
              return (
                <Pressable key={color.value} onPress={() => handleAccentChange(color.value)} style={styles.colorOption}>
                  <View style={[styles.colorSwatch, {
                    backgroundColor: color.value,
                    borderWidth: isActive ? 3 : 0,
                    borderColor: colors.text,
                  }]}>
                    {isActive && <Text style={styles.colorCheck}>✓</Text>}
                  </View>
                  <Text style={[styles.colorName, { color: isActive ? colors.text : colors.textMuted }]}>{color.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PREVIEW</Text>
          <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.previewRow}>
              <View style={[styles.previewCheckbox, { backgroundColor: colors.primary }]}>
                <Text style={styles.previewCheck}>✓</Text>
              </View>
              <View style={styles.previewContent}>
                <Text style={[styles.previewTitle, { color: colors.text }]}>Sample Habit</Text>
                <Text style={[styles.previewSub, { color: colors.textSecondary }]}>This is how your cards will look</Text>
              </View>
              <View style={[styles.previewBadge, { backgroundColor: colors.primaryBg }]}>
                <Text style={[styles.previewBadgeText, { color: colors.primary }]}>🔥 7</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.appInfo, { color: colors.textMuted }]}>Daily Companion v2.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: Spacing.xl, paddingBottom: 120 },
  title: { fontSize: FontSize.hero, fontWeight: '800', letterSpacing: -0.5, marginBottom: Spacing.xxl },
  section: { marginBottom: Spacing.xxl },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: '700', letterSpacing: 1, marginBottom: Spacing.sm, marginLeft: Spacing.xs },
  segmentedControl: { flexDirection: 'row', borderRadius: BorderRadius.lg, borderWidth: 1, overflow: 'hidden' },
  segment: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md + 2, gap: 4 },
  segmentIcon: { fontSize: 20 },
  segmentLabel: { fontSize: FontSize.sm, fontWeight: '600' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.lg, borderRadius: BorderRadius.lg, borderWidth: 1, gap: Spacing.lg, justifyContent: 'center' },
  colorOption: { alignItems: 'center', width: 60 },
  colorSwatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  colorCheck: { color: '#fff', fontSize: 18, fontWeight: '800' },
  colorName: { fontSize: FontSize.xs, fontWeight: '500', marginTop: 4 },
  previewCard: { borderRadius: BorderRadius.lg, borderWidth: 1, padding: Spacing.lg },
  previewRow: { flexDirection: 'row', alignItems: 'center' },
  previewCheckbox: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  previewCheck: { color: '#fff', fontSize: 16, fontWeight: '700' },
  previewContent: { flex: 1 },
  previewTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  previewSub: { fontSize: FontSize.sm, marginTop: 2 },
  previewBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.full },
  previewBadgeText: { fontSize: FontSize.sm, fontWeight: '700' },
  appInfo: { fontSize: FontSize.sm, textAlign: 'center', marginTop: Spacing.lg },
});
