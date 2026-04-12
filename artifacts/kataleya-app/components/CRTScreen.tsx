// components/CRTScreen.tsx
// ─────────────────────────────────────────────────────────────────────────────
// CRT monitor wrapper. Applies scanlines, phosphor flicker, and screen vignette
// over whatever children are passed. Drop over any screen to phosphor-noir it.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { PHOSPHOR } from '@/constants/phosphor-noir';

const { width: W, height: H } = Dimensions.get('window');
const SCANLINE_COUNT = 80;
const SCANLINE_SPACING = H / SCANLINE_COUNT;

interface CRTScreenProps {
  children: React.ReactNode;
  intensity?: 'low' | 'medium' | 'high';
}

export function CRTScreen({ children, intensity = 'medium' }: CRTScreenProps) {
  const flicker      = useSharedValue(1);
  const scanlineY    = useSharedValue(0);
  const rollY        = useSharedValue(0);

  useEffect(() => {
    // Subtle phosphor flicker — irregular to feel analogue
    flicker.value = withRepeat(
      withSequence(
        withTiming(0.97, { duration: 80,  easing: Easing.linear }),
        withTiming(1.00, { duration: 40,  easing: Easing.linear }),
        withTiming(0.98, { duration: 120, easing: Easing.linear }),
        withTiming(1.00, { duration: 60,  easing: Easing.linear }),
      ),
      -1,
      false,
    );

    // Rolling scanline band — slow pass from top to bottom
    rollY.value = withRepeat(
      withTiming(1, { duration: 7000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const screenStyle = useAnimatedStyle(() => ({
    opacity: flicker.value,
  }));

  const rollStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: rollY.value * H }],
  }));

  const vignetteStrength = intensity === 'high' ? 0.9 : intensity === 'medium' ? 0.65 : 0.4;
  const scanlineOpacity  = intensity === 'high' ? 0.5 : intensity === 'medium' ? 0.3 : 0.15;

  return (
    <View style={[styles.container, { backgroundColor: PHOSPHOR.bg }]}>
      {/* Content layer */}
      <Animated.View style={[StyleSheet.absoluteFill, screenStyle]}>
        {children}
      </Animated.View>

      {/* Static scanlines */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: SCANLINE_COUNT }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.scanline,
              {
                top: i * SCANLINE_SPACING,
                opacity: scanlineOpacity,
              },
            ]}
          />
        ))}
      </View>

      {/* Rolling bright band — CRT refresh sweep */}
      <Animated.View
        style={[styles.rollBand, rollStyle]}
        pointerEvents="none"
      />

      {/* Vignette — rounded CRT tube corners */}
      <LinearGradient
        colors={[
          `rgba(0,0,0,${vignetteStrength})`,
          'transparent',
          'transparent',
          `rgba(0,0,0,${vignetteStrength})`,
        ]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[
          `rgba(0,0,0,${vignetteStrength})`,
          'transparent',
          'transparent',
          `rgba(0,0,0,${vignetteStrength})`,
        ]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Phosphor green ambient tint */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(0,20,0,0.06)' },
        ]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#000000',
  },
  rollBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -H * 0.15,
    height: H * 0.15,
    backgroundColor: 'rgba(51,255,0,0.03)',
  },
});
