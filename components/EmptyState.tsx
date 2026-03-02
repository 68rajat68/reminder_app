import React, { useEffect, useRef } from "react";
import { Text, StyleSheet, Animated } from "react-native";
import { ThemeColors, FontSize, Spacing } from "../constants/theme";

interface Props {
  colors: ThemeColors;
}

export default function EmptyState({ colors }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Animated.View
        style={[
          styles.iconContainer,
          {
            backgroundColor: colors.primaryBg,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Text style={styles.icon}>🔔</Text>
      </Animated.View>
      <Text style={[styles.title, { color: colors.text }]}>
        No reminders yet
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Tap the + button to create{"\n"}your first reminder
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 100,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: "center",
    lineHeight: 22,
  },
});
