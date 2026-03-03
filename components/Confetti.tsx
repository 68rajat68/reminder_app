// Fix #11: Use useWindowDimensions instead of module-level Dimensions.get
import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';

const CONFETTI_COUNT = 30;
const CONFETTI_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#14b8a6'];

interface Props {
  visible: boolean;
  onComplete?: () => void;
}

function ConfettiPiece({ delay, color, screenWidth, screenHeight }: { delay: number; color: string; screenWidth: number; screenHeight: number }) {
  const translateY = useRef(new Animated.Value(-20)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const startX = useMemo(() => Math.random() * screenWidth, [screenWidth]);
  const pieceSize = useMemo(() => ({ w: 8 + Math.random() * 6, h: 8 + Math.random() * 6, round: Math.random() > 0.5 }), []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: screenHeight + 50,
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
        width: pieceSize.w,
        height: pieceSize.h,
        borderRadius: pieceSize.round ? 50 : 2,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate: spin }],
      }]}
    />
  );
}

export default function Confetti({ visible, onComplete }: Props) {
  const { width, height } = useWindowDimensions();

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
          screenWidth={width}
          screenHeight={height}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, zIndex: 1000 },
  piece: { position: 'absolute', top: -20 },
});
