// components/MercuryTabBar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Mercury tab bar — liquid physics.
//
// The thread is a cubic-bezier arch that bends upward into the active droplet.
// The droplet is elongated vertically (surface tension), has a radial gradient
// fill (sphere depth), and a specular highlight (reflective mercury).
// Inactive beads sit on the thread with a micro-specular dot.
// Everything morphs via Reanimated shared values — no frame drops.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Dimensions, Animated, Easing, Platform,
} from 'react-native';
import Svg, {
  Path, Ellipse, Circle, Defs, RadialGradient, LinearGradient,
  Stop, G,
} from 'react-native-svg';
import ReAnimated, {
  useSharedValue, withSpring, useAnimatedProps,
  interpolate, Extrapolation,
} from 'react-native-reanimated';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

// ── Animated SVG primitives ───────────────────────────────────────────────────
const AnimatedPath    = ReAnimated.createAnimatedComponent(Path);
const AnimatedEllipse = ReAnimated.createAnimatedComponent(Ellipse);
const AnimatedCircle  = ReAnimated.createAnimatedComponent(Circle);

const { width: W } = Dimensions.get('window');

// ── Geometry ──────────────────────────────────────────────────────────────────
const SVG_H   = 52;   // height of interactive drawing canvas
const BASE_Y  = 38;   // Y where thread rests (bottom of arch)
const PEAK_Y  = 9;    // Y where active droplet center sits (top of arch)
const L_PAD   = 20;   // left margin for thread start
const R_PAD   = 20;   // right margin for thread end

// Build the cubic-bezier thread path that arches up at activeX.
// Two C segments: (left edge → peak) and (peak → right edge).
// Control points placed at 42% and 70% of each segment for a tight, viscous arch.
function buildThreadPath(activeX: number): string {
  const lx  = L_PAD;
  const rx  = W - R_PAD;
  const rem = rx - activeX;

  return [
    `M ${lx} ${BASE_Y}`,
    `C ${lx + (activeX - lx) * 0.42} ${BASE_Y}`,
    `  ${lx + (activeX - lx) * 0.70} ${PEAK_Y}`,
    `  ${activeX} ${PEAK_Y}`,
    `C ${activeX + rem * 0.30} ${PEAK_Y}`,
    `  ${activeX + rem * 0.58} ${BASE_Y}`,
    `  ${rx} ${BASE_Y}`,
  ].join(' ');
}

// ── Label fade — RN Animated (JS-side, smooth across tab switch) ──────────────
function useTabLabels(count: number, activeIdx: number) {
  const anims = useRef(
    Array.from({ length: count }, (_, i) => new Animated.Value(i === activeIdx ? 1 : 0))
  ).current;

  useEffect(() => {
    anims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: i === activeIdx ? 1 : 0,
        duration: 240,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
  }, [activeIdx]);

  return anims;
}

// ── MercuryTabBar ─────────────────────────────────────────────────────────────
export function MercuryTabBar({
  state,
  descriptors,
  navigation,
  accentRgb,
  onLongPress,
}: BottomTabBarProps & { accentRgb: string; onLongPress: () => void }) {
  const insets  = useSafeAreaInsets();
  const n       = state.routes.length;
  const tabW    = W / n;

  // Shared value drives ALL animated SVG props — one spring, many consumers
  const activeIdx = useSharedValue(state.index);

  useEffect(() => {
    activeIdx.value = withSpring(state.index, {
      damping:   22,
      stiffness: 160,
      mass:      0.8,
    });
  }, [state.index]);

  // Label fades
  const labelAnims = useTabLabels(n, state.index);

  // ── Thread — main arch ───────────────────────────────────────────────────
  const threadProps = useAnimatedProps(() => {
    const ax = (activeIdx.value + 0.5) * tabW;
    return { d: buildThreadPath(ax) };
  });

  // ── Thread glow — same arch, softer, wider ───────────────────────────────
  const glowProps = useAnimatedProps(() => {
    const ax = (activeIdx.value + 0.5) * tabW;
    return { d: buildThreadPath(ax) };
  });

  // ── Active droplet body (elongated — surface tension) ────────────────────
  const dropProps = useAnimatedProps(() => {
    return { cx: (activeIdx.value + 0.5) * tabW, cy: PEAK_Y };
  });

  // ── Droplet shadow (dark ellipse slightly below, creates lift) ───────────
  const dropShadowProps = useAnimatedProps(() => {
    return { cx: (activeIdx.value + 0.5) * tabW + 0.5, cy: PEAK_Y + 2 };
  });

  // ── Specular highlight — offset toward top-left (single light source) ───
  const specProps = useAnimatedProps(() => {
    return { cx: (activeIdx.value + 0.5) * tabW - 1.8, cy: PEAK_Y - 3.2 };
  });

  // ── Specular micro-gleam (smaller, brighter, even higher) ───────────────
  const gleamProps = useAnimatedProps(() => {
    return { cx: (activeIdx.value + 0.5) * tabW - 0.5, cy: PEAK_Y - 5.0 };
  });

  // ── Bottom meniscus — the thread curves INTO the droplet ─────────────────
  // This is the thread path itself touching the droplet base — visual only,
  // no extra geometry needed; the arch tangent is already tangent to ellipse.

  const totalH = SVG_H + insets.bottom;

  return (
    <View style={[styles.container, { height: totalH }]}>

      {/* ── SVG drawing canvas ─────────────────────────────────────────── */}
      <Svg
        width={W}
        height={SVG_H}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          {/* Sphere gradient on active droplet — bright top-left, dim bottom */}
          <RadialGradient id="dropGrad" cx="35%" cy="25%" r="75%">
            <Stop offset="0"   stopColor={`rgb(${accentRgb})`} stopOpacity="1"   />
            <Stop offset="0.5" stopColor={`rgb(${accentRgb})`} stopOpacity="0.9" />
            <Stop offset="1"   stopColor={`rgb(${accentRgb})`} stopOpacity="0.65"/>
          </RadialGradient>

          {/* Glow gradient for the thread — brighter at arch peak */}
          <LinearGradient id="threadGlow" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor={`rgb(${accentRgb})`} stopOpacity="0.18"/>
            <Stop offset="1"   stopColor={`rgb(${accentRgb})`} stopOpacity="0.04"/>
          </LinearGradient>
        </Defs>

        {/* Thread diffuse glow — fat, very soft */}
        <AnimatedPath
          animatedProps={glowProps}
          fill="none"
          stroke={`rgba(${accentRgb}, 0.09)`}
          strokeWidth={10}
          strokeLinecap="round"
        />

        {/* Thread body — the wire */}
        <AnimatedPath
          animatedProps={threadProps}
          fill="none"
          stroke={`rgba(${accentRgb}, 0.42)`}
          strokeWidth={1.4}
          strokeLinecap="round"
        />

        {/* Inactive beads — sit on the thread */}
        {state.routes.map((route, i) => {
          if (i === state.index) return null;
          const cx = (i + 0.5) * tabW;
          return (
            <G key={route.key}>
              {/* Bead body */}
              <Circle
                cx={cx}
                cy={BASE_Y}
                r={3.5}
                fill={`rgba(${accentRgb}, 0.28)`}
                stroke={`rgba(${accentRgb}, 0.5)`}
                strokeWidth={0.4}
              />
              {/* Micro-specular on bead */}
              <Circle
                cx={cx - 0.9}
                cy={BASE_Y - 1.5}
                r={0.8}
                fill="rgba(255,255,255,0.38)"
              />
            </G>
          );
        })}

        {/* Active droplet — lifted, elongated, reflective */}
        <G>
          {/* Shadow — dark smear beneath, suggests elevation */}
          <AnimatedEllipse
            animatedProps={dropShadowProps}
            rx={7}
            ry={5}
            fill="rgba(0,0,0,0.5)"
          />

          {/* Droplet body — sphere gradient (bright top-left → dim bottom-right) */}
          <AnimatedEllipse
            animatedProps={dropProps}
            rx={6.5}
            ry={9}
            fill="url(#dropGrad)"
            stroke={`rgba(${accentRgb}, 0.6)`}
            strokeWidth={0.5}
          />

          {/* Specular highlight — the liquid mirror */}
          <AnimatedEllipse
            animatedProps={specProps}
            rx={2.0}
            ry={1.2}
            fill="rgba(255,255,255,0.52)"
          />

          {/* Micro-gleam — pinpoint of light at top */}
          <AnimatedCircle
            animatedProps={gleamProps}
            r={0.7}
            fill="rgba(255,255,255,0.80)"
          />
        </G>
      </Svg>

      {/* ── Tab labels — below beads, fade with active state ───────────── */}
      {state.routes.map((route, i) => {
        const { options } = descriptors[route.key];
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title ?? route.name;

        return (
          <Animated.Text
            key={route.key}
            style={[
              styles.label,
              {
                left:    i * tabW,
                width:   tabW,
                bottom:  insets.bottom + 2,
                color:   `rgba(${accentRgb}, 1)`,
                opacity: labelAnims[i].interpolate({
                  inputRange:  [0, 1],
                  outputRange: [0.18, 0.75],
                }),
              },
            ]}
          >
            {label}
          </Animated.Text>
        );
      })}

      {/* ── Invisible pressable tiles — full width × height of each tab ── */}
      {state.routes.map((route, i) => (
        <Pressable
          key={route.key}
          style={[styles.tile, { left: i * tabW, width: tabW }]}
          onPress={() => {
            const isActive = state.index === i;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const event = navigation.emit({
              type:             'tabPress',
              target:           route.key,
              canPreventDefault: true,
            });
            if (!isActive && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          }}
          onLongPress={onLongPress}
          hitSlop={4}
        />
      ))}

      {/* ── Safe area spacer ─────────────────────────────────────────────── */}
      <View style={{ height: insets.bottom }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    backgroundColor: '#050508',
    zIndex:          100,
  },
  label: {
    position:      'absolute',
    textAlign:     'center',
    fontFamily:    'CourierPrime',
    fontSize:      8,
    letterSpacing: 1.5,
    textTransform: 'lowercase',
  },
  tile: {
    position: 'absolute',
    top:      0,
    height:   SVG_H,
  },
});
