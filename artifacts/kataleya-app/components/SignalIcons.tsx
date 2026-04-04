'use no memo';
import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';

// ── Water — layered ocean swells ──────────────────────────────────────────────
// Three wave planes at different depths. The foreground swell is slower,
// wider, more opaque. Background planes are faster, flatter, faint.
// Together they read as open water.

interface WaveLayerProps {
  color: string;
  svgW: number;
  height: number;
  cy: number;
  amplitude: number;
  opacity: number;
  strokeWidth: number;
  period: number;
  phaseShift: number; // horizontal offset in px, 0..svgW/2
}

function buildWavePath(svgW: number, cy: number, amp: number, shift: number): string {
  const w = svgW;
  const s = shift;
  return [
    `M ${s} ${cy}`,
    `C ${s + w * 0.12} ${cy - amp}, ${s + w * 0.38} ${cy - amp}, ${s + w * 0.5} ${cy}`,
    `C ${s + w * 0.62} ${cy + amp}, ${s + w * 0.88} ${cy + amp}, ${s + w} ${cy}`,
    `C ${s + w * 1.12} ${cy - amp}, ${s + w * 1.38} ${cy - amp}, ${s + w * 1.5} ${cy}`,
    `C ${s + w * 1.62} ${cy + amp}, ${s + w * 1.88} ${cy + amp}, ${s + w * 2} ${cy}`,
  ].join(' ');
}

function WaveLayer({ color, svgW, height, cy, amplitude, opacity, strokeWidth, period, phaseShift }: WaveLayerProps) {
  const anim = useRef(new Animated.Value(phaseShift)).current;

  useEffect(() => {
    const run = () => {
      anim.setValue(phaseShift);
      Animated.timing(anim, {
        toValue: phaseShift - svgW / 2,
        duration: period,
        useNativeDriver: true,
        easing: Easing.linear,
      }).start(({ finished }) => { if (finished) run(); });
    };
    run();
    return () => anim.stopAnimation();
  }, []);

  const path = buildWavePath(svgW, cy, amplitude, 0);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        transform: [{ translateX: anim }],
      }}
    >
      <Svg width={svgW * 2} height={height}>
        <Path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} opacity={opacity} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

export function WaterVisual({
  color = '#87a878',
  width = 200,
  height = 36,
}: {
  color?: string;
  width?: number;
  height?: number;
}) {
  const svgW = width * 2;

  // Three depth planes: foreground swell, mid-swell, distant chop
  const waves = [
    { cy: height * 0.72, amp: height * 0.22, opacity: 0.80, sw: 1.4, period: 5600, phase: 0 },
    { cy: height * 0.50, amp: height * 0.16, opacity: 0.50, sw: 1.0, period: 4200, phase: width * 0.25 },
    { cy: height * 0.32, amp: height * 0.10, opacity: 0.28, sw: 0.7, period: 3100, phase: width * 0.6 },
  ];

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      {waves.map((w, i) => (
        <WaveLayer
          key={i}
          color={color}
          svgW={svgW}
          height={height}
          cy={w.cy}
          amplitude={w.amp}
          opacity={w.opacity}
          strokeWidth={w.sw}
          period={w.period}
          phaseShift={w.phase}
        />
      ))}
    </View>
  );
}

// ── Light — a sun with varied rays ────────────────────────────────────────────
// A small disc with 8 primary rays and 8 shorter interstitial rays.
// The outer corona pulses on a slow breath cycle.

export function LightVisual({
  color = '#d4a373',
  size = 36,
}: {
  color?: string;
  size?: number;
}) {
  const corona = useRef(new Animated.Value(0.75)).current;
  const glow   = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(corona, { toValue: 1, duration: 3200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
          Animated.timing(corona, { toValue: 0.75, duration: 3200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        ]),
        Animated.sequence([
          Animated.timing(glow, { toValue: 0.6, duration: 3200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
          Animated.timing(glow, { toValue: 0.3, duration: 3200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        ]),
      ])
    ).start();
    return () => { corona.stopAnimation(); glow.stopAnimation(); };
  }, []);

  const R  = size / 2;
  const discR = R * 0.22;
  const innerR = R * 0.33;  // ray starts just past disc edge

  // 8 primary rays (longer), 8 secondary rays (shorter), alternating at 22.5°
  const rays: { deg: number; len: number; sw: number; op: number }[] = [];
  for (let i = 0; i < 16; i++) {
    const isPrimary = i % 2 === 0;
    rays.push({
      deg: i * 22.5,
      len: isPrimary ? R * 0.50 : R * 0.28,
      sw:  isPrimary ? 1.1 : 0.7,
      op:  isPrimary ? 0.85 : 0.45,
    });
  }

  return (
    <View style={{ width: size, height: size }}>
      {/* Corona pulse layer */}
      <Animated.View
        style={{
          position: 'absolute',
          inset: 0,
          opacity: glow,
          transform: [{ scale: corona }],
        }}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={R} cy={R} r={R * 0.70} fill={color} opacity={0.08} />
          <Circle cx={R} cy={R} r={R * 0.45} fill={color} opacity={0.10} />
        </Svg>
      </Animated.View>

      {/* Static rays + disc */}
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rays.map(({ deg, len, sw, op }, i) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <Line
              key={i}
              x1={R + innerR * Math.cos(rad)}
              y1={R + innerR * Math.sin(rad)}
              x2={R + (innerR + len) * Math.cos(rad)}
              y2={R + (innerR + len) * Math.sin(rad)}
              stroke={color}
              strokeWidth={sw}
              opacity={op}
              strokeLinecap="round"
            />
          );
        })}
        <Circle cx={R} cy={R} r={discR} fill={color} opacity={0.95} />
        <Circle cx={R} cy={R} r={discR * 0.55} fill={color} opacity={1} />
      </Svg>
    </View>
  );
}

// ── Compact banner variants ───────────────────────────────────────────────────

export function WaterBanner({ color = '#87a878' }: { color?: string }) {
  return <WaterVisual color={color} width={88} height={28} />;
}

export function LightBanner({ color = '#d4a373' }: { color?: string }) {
  return <LightVisual color={color} size={28} />;
}
