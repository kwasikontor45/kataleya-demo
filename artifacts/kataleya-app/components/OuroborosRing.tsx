// components/OuroborosRing.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The living cycle engine — replaces the static CircadianBadge pill.
// Never complete. Always a gap. Scar marks from survived cycles.
// Phase-aware rotation speed. Breathing scale.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';

type OuroborosPhase = 'dawn' | 'day' | 'goldenHour' | 'night';

interface OuroborosRingProps {
  size?: number;
  color: string;
  cycleCount?: number;  // scar marks — one per 3 days sober
  phase: OuroborosPhase;
  breathing?: boolean;
  showDots?: boolean;   // head + gap dots — off on cover screen
}

// Phase rotation speeds — desire is fastest, void is slowest
const PHASE_SPEED: Record<OuroborosPhase, number> = {
  dawn:       14000,  // systems online — moderate
  day:        10000,  // full presence — sharpest
  goldenHour:  8000,  // the threshold — urgent
  night:      22000,  // deep cloak — slowest
};

export function OuroborosRing({
  size = 120,
  color,
  cycleCount = 0,
  phase,
  breathing = true,
  showDots = true,
}: OuroborosRingProps) {
  const pulse = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Breathing
    if (breathing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.06,
            duration: 2400,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 2400,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }),
        ])
      ).start();
    }

    // Phase-aware rotation
    rotate.setValue(0);
    Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: PHASE_SPEED[phase],
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();

    return () => {
      pulse.stopAnimation();
      rotate.stopAnimation();
    };
  }, [phase, breathing]);

  const rotation = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const R = size / 2;
  const strokeW = 1.2;
  const radius = R - strokeW - 3;
  const circ = 2 * Math.PI * radius;

  // Gap = 8% of circumference — the ouroboros never closes
  const gapFraction = 0.08;
  const arcLength = circ * (1 - gapFraction);

  // Scar marks — survived cycles (max 12 visible)
  const visibleScars = Math.min(Math.floor(cycleCount / 3), 12);
  const scarArcs = Array.from({ length: visibleScars }, (_, i) => {
    const angleDeg = (i / 12) * 360;
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x1: R + radius * Math.cos(rad),
      y1: R + radius * Math.sin(rad),
      x2: R + radius * Math.cos(rad + 0.14),
      y2: R + radius * Math.sin(rad + 0.14),
    };
  });

  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={{
          width: size,
          height: size,
          transform: [{ scale: pulse }, { rotate: rotation }],
        }}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Base ring — segmented, mechanical */}
          <Circle
            cx={R} cy={R} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeOpacity={0.15}
            strokeDasharray={`${arcLength} ${circ - arcLength}`}
            strokeLinecap="butt"
            rotation={-90}
            origin={`${R}, ${R}`}
          />
          {/* Segment ticks — EVE Online style */}
          <Circle
            cx={R} cy={R} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeW * 2.5}
            strokeOpacity={0.22}
            strokeDasharray={`1.5 ${circ / 32}`}
            strokeLinecap="butt"
            rotation={-90}
            origin={`${R}, ${R}`}
          />

          {/* Scar marks — proof of survived cycles */}
          {scarArcs.map((scar, i) => (
            <Path
              key={i}
              d={`M ${scar.x1} ${scar.y1} A ${radius} ${radius} 0 0 1 ${scar.x2} ${scar.y2}`}
              fill="none"
              stroke="#8a8a9e"
              strokeWidth={strokeW + 0.5}
              strokeLinecap="round"
              opacity={0.7}
            />
          ))}

          {/* Head + gap — only shown when showDots is true */}
          {showDots && (
            <>
              <Circle
                cx={R + radius}
                cy={R}
                r={3}
                fill={color}
                opacity={0.95}
              />
              <Circle
                cx={R + radius * Math.cos(Math.PI * (1 - gapFraction / 2))}
                cy={R + radius * Math.sin(Math.PI * (1 - gapFraction / 2))}
                r={2}
                fill="#00d4aa"
                opacity={0.9}
              />
            </>
          )}
        </Svg>
      </Animated.View>
    </View>
  );
}
