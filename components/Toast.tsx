import React, { useEffect, useRef } from "react";
import { Text, StyleSheet, Animated, useColorScheme } from "react-native";
import { useThemeColors, Spacing, BorderRadius, FontSize } from "../constants/theme";

interface Props {
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

export default function Toast({ message, visible, onHide, duration = 3000 }: Props) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 100,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 100,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => onHide());
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.text,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Text style={styles.icon}>🔔</Text>
      <Text style={[styles.message, { color: colors.background }]} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 40,
    left: Spacing.xl,
    right: Spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    borderRadius: BorderRadius.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: {
    fontSize: 18,
    marginRight: Spacing.sm + 2,
  },
  message: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },
});
