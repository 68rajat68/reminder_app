import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONFETTI_COUNT = 30;
const CONFETTI_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#14b8a6'];

interface Props {
  visible: boolean;
  onComplete?: () => void;
}

function ConfettiPiece({ delay, color }: { delay: number; color: string }) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const startX = Math.random() * SCREEN_WIDTH;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT + 50,
        duration: 2000 + Math.random() * 1000,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: (Math.random() - 0.5) * 200,
        duration: 2000 + Math.random() * 1000,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 2500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: Math.random() * 10,
        duration: 2500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 10], outputRange: ['0deg', '3600deg'] });

  return (
    <Animated.View
      style={[styles.piece, {
        left: startX,
        backgroundColor: color,
        width: 8 + Math.random() * 6,
        height: 8 + Math.random() * 6,
        borderRadius: Math.random() > 0.5 ? 50 : 2,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate: spin }],
      }]}
    />
  );
}

export default function Confetti({ visible, onComplete }: Props) {
  useEffect(() => {
    if (visible && onComplete) {
      const timer = setTimeout(onComplete, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
        <ConfettiPiece
          key={i}
          delay={i * 50}
          color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
  piece: { position: 'absolute', top: -20 },
});
