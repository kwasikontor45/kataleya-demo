'use no memo';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface Props {
  size?: number;
}

// Butterfly SVG from the HTML prototype butterfly-logo mask paths.
// Wings are drawn as bezier curves from centre point (50,50).
// Gradient: sage #87a878 → terra #d4a373 — matches HTML linear-gradient.
export function ButterflyLogo({ size = 36 }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Matches HTML @keyframes logo-pulse — 3s ease-in-out infinite
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: pulse }], width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="wing-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#87a878" />
            <Stop offset="100%" stopColor="#d4a373" />
          </LinearGradient>
        </Defs>
        {/* Left wing */}
        <Path
          d="M50 50 Q20 10 10 30 Q5 50 20 55 Q35 60 50 50"
          fill="url(#wing-grad)"
          opacity={0.9}
        />
        {/* Right wing */}
        <Path
          d="M50 50 Q80 10 90 30 Q95 50 80 55 Q65 60 50 50"
          fill="url(#wing-grad)"
          opacity={0.9}
        />
        {/* Body */}
        <Path
          d="M50 50 L50 78"
          stroke="url(#wing-grad)"
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* Head */}
        <Circle cx={50} cy={44} r={4} fill="url(#wing-grad)" />
      </Svg>
    </Animated.View>
  );
}
