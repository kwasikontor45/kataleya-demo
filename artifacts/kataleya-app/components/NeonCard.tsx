// components/NeonCard.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Glassmorphism foundation — replaces the border-only NeonCard.
// Retains the same API so no screen changes are needed.
// Adds: noise texture overlay, subtle shimmer, scar wear from cycleCount.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useRef, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Animated,
  Easing, ViewStyle,
} from 'react-native';
import Svg, { Rect, Filter, FeTurbulence, FeColorMatrix, FeBlend, Defs } from 'react-native-svg';

export const NEON_RGB = {
  cyan:   '0,212,170',
  amber:  '255,107,53',
  violet: '155,109,255',
  pink:   '255,100,180',
};

type GlowColor = 'cyan' | 'amber' | 'violet' | 'pink';

interface NeonCardProps {
  children: React.ReactNode;
  theme: any;
  accentRgb?: string;
  glowColor?: GlowColor;
  fillIntensity?: number;
  borderIntensity?: number;
  onPress?: () => void;
  style?: ViewStyle;
  cycleCount?: number; // scar wear level — 0 = pristine
}

const GLOW_MAP: Record<GlowColor, string> = {
  cyan:   NEON_RGB.cyan,
  amber:  NEON_RGB.amber,
  violet: NEON_RGB.violet,
  pink:   NEON_RGB.pink,
};

// Seeded deterministic RNG for consistent scar positions
class SeededRandom {
  private s: number;
  constructor(seed: number) { this.s = seed; }
  next() { this.s = (this.s * 9301 + 49297) % 233280; return this.s / 233280; }
  range(min: number, max: number) { return min + this.next() * (max - min); }
}

export function NeonCard({
  children,
  theme,
  accentRgb,
  glowColor,
  fillIntensity = 0.05,
  borderIntensity = 0.18,
  onPress,
  style,
  cycleCount = 0,
}: NeonCardProps) {
  const rgb = accentRgb ?? (glowColor ? GLOW_MAP[glowColor] : NEON_RGB.cyan);
  const shimmer = useRef(new Animated.Value(0)).current;
  const [dims, setDims] = React.useState({ w: 0, h: 0 });

  // Subtle shimmer — light catching worn surface
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 9000 + Math.random() * 4000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 9000 + Math.random() * 4000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();
    return () => shimmer.stopAnimation();
  }, []);

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.0, 0.04],
  });

  // Generate scar marks from cycle count
  const scarCount = Math.min(Math.floor(cycleCount / 3), 8);
  const rng = new SeededRandom(cycleCount * 1337);
  const scars = Array.from({ length: scarCount }, () => ({
    x1: rng.range(0.1, 0.9),
    y1: rng.range(0.1, 0.9),
    len: rng.range(0.05, 0.2),
    angle: rng.range(0, Math.PI),
    opacity: rng.range(0.04, 0.10),
  }));

  const noiseSeed = (cycleCount % 100) + 42;

  const Container = onPress ? TouchableOpacity : View;
  const containerProps = onPress ? { onPress, activeOpacity: 0.82 } : {};

  return (
    <Container
      {...containerProps}
      style={[
        styles.card,
        {
          backgroundColor: `rgba(${rgb},${fillIntensity})`,
          borderColor: `rgba(${rgb},${borderIntensity})`,
          borderTopColor: `rgba(${rgb},${Math.min(borderIntensity * 1.8, 0.42)})`,
          borderTopWidth: 1.5,
          shadowColor: `rgb(${rgb})`,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
          elevation: 3,
        },
        style,
      ]}
      onLayout={e => {
        const { width, height } = e.nativeEvent.layout;
        setDims({ w: Math.round(width), h: Math.round(height) });
      }}
    >
      {/* Noise texture via SVG feTurbulence */}
      {dims.w > 0 && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={dims.w} height={dims.h}>
            <Defs>
              <Filter id={`noise-${noiseSeed}`} x="0%" y="0%" width="100%" height="100%">
                <FeTurbulence
                  type="fractalNoise"
                  baseFrequency="0.72"
                  numOctaves="3"
                  seed={noiseSeed}
                  result="noise"
                />
                <FeColorMatrix
                  type="matrix"
                  values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.35 0"
                  in="noise"
                  result="coloredNoise"
                />
                
              </Filter>
            </Defs>
            <Rect
              x={0} y={0}
              width={dims.w} height={dims.h}
              fill={`rgba(${rgb},0.015)`}
              filter={`url(#noise-${noiseSeed})`}
            />
          </Svg>
        </View>
      )}

      {/* Shimmer — light on worn surface */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: `rgba(${rgb},1)`,
            opacity: shimmerOpacity,
            borderRadius: 14,
          },
        ]}
      />

      {/* Scar marks — proof of survived cycles */}
      {scars.length > 0 && dims.w > 0 && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width={dims.w} height={dims.h}>
            {scars.map((scar, i) => {
              const x1 = scar.x1 * dims.w;
              const y1 = scar.y1 * dims.h;
              const x2 = x1 + scar.len * dims.w * Math.cos(scar.angle);
              const y2 = y1 + scar.len * dims.h * Math.sin(scar.angle);
              return (
                <Rect
                  key={i}
                  x={Math.min(x1, x2)}
                  y={Math.min(y1, y2)}
                  width={Math.abs(x2 - x1) + 0.5}
                  height={0.5}
                  fill={`rgba(138,138,158,${scar.opacity})`}
                  transform={`rotate(${scar.angle * 180 / Math.PI},${x1},${y1})`}
                />
              );
            })}
          </Svg>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    zIndex: 1,
  },
});
