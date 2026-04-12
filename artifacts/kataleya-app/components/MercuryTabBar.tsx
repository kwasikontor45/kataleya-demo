// components/MercuryTabBar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Mercury tab bar — liquid material, not painted shapes.
//
// Thread: LinearGradient wire, bright center fading to edges.
// Active droplet: elongated sphere — LinearGradient fill (bright → dim),
//   specular highlight (white oval, top-left — single light source),
//   neck connecting it to the thread.
// Inactive beads: gradient-filled circles, micro-specular dot.
//
// All animation: React Native Animated only — no Reanimated+SVG combo
// (that crashes Expo Go). Spring-based X position, instant Y (always lifted).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Dimensions,
  Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width: W } = Dimensions.get('window');

// ── Geometry ──────────────────────────────────────────────────────────────────
const BAR_H   = 52;   // interactive drawing area height
const THREAD_Y = 36;  // thread center Y (from top of BAR_H)
const DROP_CY  = 18;  // active droplet center Y
const DROP_W   = 13;  // droplet width
const DROP_H   = 19;  // droplet height — elongated, surface tension
const NECK_W   = 4;   // neck width at widest
const NECK_H   = THREAD_Y - (DROP_CY + DROP_H / 2); // gap between drop bottom and thread
const BEAD_D   = 9;   // inactive bead diameter
const L_PAD    = 18;
const R_PAD    = 18;

// Darken an RGB string for gradient shadow end
function darkenRgb(rgb: string): string {
  const [r, g, b] = rgb.split(',').map(Number);
  return `${Math.floor(r * 0.45)},${Math.floor(g * 0.45)},${Math.floor(b * 0.45)}`;
}

// ── Single inactive bead ──────────────────────────────────────────────────────
function Bead({ cx, accentRgb }: { cx: number; accentRgb: string }) {
  const dark = darkenRgb(accentRgb);
  return (
    <View
      style={{
        position:     'absolute',
        left:         cx - BEAD_D / 2,
        top:          THREAD_Y - BEAD_D / 2,
        width:        BEAD_D,
        height:       BEAD_D,
        borderRadius: BEAD_D / 2,
        overflow:     'hidden',
        borderWidth:  0.5,
        borderColor:  `rgba(${accentRgb}, 0.4)`,
      }}
    >
      {/* Gradient sphere fill */}
      <LinearGradient
        colors={[`rgba(${accentRgb},0.55)`, `rgba(${dark},0.22)`]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Micro-specular — single light source top-left */}
      <View style={[styles.beadSpecular]} />
    </View>
  );
}

// ── Active droplet ────────────────────────────────────────────────────────────
function ActiveDrop({
  cx,
  accentRgb,
}: {
  cx: Animated.AnimatedInterpolation<number> | Animated.Value;
  accentRgb: string;
}) {
  const dark = darkenRgb(accentRgb);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top:      DROP_CY - DROP_H / 2,
        // left offset accounts for the droplet being centered on cx
        left:     Animated.subtract(cx as Animated.Value, DROP_W / 2),
        width:    DROP_W,
        // Total height includes neck connecting to thread
        height:   DROP_H + NECK_H,
        alignItems: 'center',
      }}
    >
      {/* ── Sphere body ── */}
      <View
        style={{
          width:        DROP_W,
          height:       DROP_H,
          borderRadius: DROP_W / 2,
          overflow:     'hidden',
          borderWidth:  0.6,
          borderColor:  `rgba(${accentRgb}, 0.55)`,
          // Elevation / shadow
          shadowColor:  `rgb(${accentRgb})`,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.55,
          shadowRadius:  6,
          elevation:     8,
        }}
      >
        {/* Gradient fill — bright at top-left, dark at bottom */}
        <LinearGradient
          colors={[
            `rgba(255,255,255,0.22)`,
            `rgba(${accentRgb},1)`,
            `rgba(${dark},0.85)`,
          ]}
          locations={[0, 0.38, 1]}
          start={{ x: 0.25, y: 0 }}
          end={{ x: 0.75, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Specular highlight — the mercury mirror */}
        <View style={styles.dropSpecular} />
        {/* Micro gleam */}
        <View style={styles.dropGleam} />
      </View>

      {/* ── Neck — meniscus connecting sphere to thread ── */}
      {NECK_H > 0 && (
        <LinearGradient
          colors={[`rgba(${accentRgb},0.45)`, `rgba(${accentRgb},0.10)`]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            width:              NECK_W,
            height:             NECK_H,
            borderBottomLeftRadius:  NECK_W / 2,
            borderBottomRightRadius: NECK_W / 2,
            marginTop:          -1, // overlap the bottom of the sphere slightly
          }}
        />
      )}
    </Animated.View>
  );
}

// ── MercuryTabBar ─────────────────────────────────────────────────────────────
export function MercuryTabBar({
  state,
  descriptors,
  navigation,
  accentRgb,
  onLongPress,
}: BottomTabBarProps & { accentRgb: string; onLongPress: () => void }) {
  const insets = useSafeAreaInsets();
  const n      = state.routes.length;
  const tabW   = W / n;

  // Ambient shimmer — travels left→right through the thread, seamlessly loops.
  // Starts off left edge, exits off right edge, instantly resets to left (off-screen),
  // starts again. The reset is invisible because both endpoints are off-screen.
  const shimmerX     = useRef(new Animated.Value(-50)).current;
  const shimmerAlive = useRef(true);

  useEffect(() => {
    const runShimmer = () => {
      shimmerX.setValue(-50);
      Animated.timing(shimmerX, {
        toValue:         W + 50,
        duration:        5200,
        easing:          Easing.linear,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && shimmerAlive.current) runShimmer();
      });
    };
    runShimmer();
    return () => {
      shimmerAlive.current = false;
      shimmerX.stopAnimation();
    };
  }, []);

  // Spring the droplet X to active tab center
  const dropX = useRef(new Animated.Value((state.index + 0.5) * tabW)).current;

  useEffect(() => {
    Animated.spring(dropX, {
      toValue:         (state.index + 0.5) * tabW,
      damping:         20,
      stiffness:       160,
      mass:            0.75,
      useNativeDriver: false, // drives `left` — needs JS driver
    }).start();
  }, [state.index, tabW]);

  // Label opacity — fade between active and inactive
  const labelAnims = useRef(
    state.routes.map((_, i) => new Animated.Value(i === state.index ? 1 : 0))
  ).current;

  useEffect(() => {
    labelAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue:         i === state.index ? 1 : 0,
        duration:        220,
        easing:          Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
  }, [state.index]);

  return (
    <View style={[styles.container, { height: BAR_H + insets.bottom }]}>

      {/* ── Thread — the mercury wire ──────────────────────────────────── */}
      <LinearGradient
        colors={[
          `rgba(${accentRgb},0.06)`,
          `rgba(${accentRgb},0.45)`,
          `rgba(${accentRgb},0.06)`,
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.thread, { top: THREAD_Y }]}
      />

      {/* Thread inner highlight — bright core line */}
      <LinearGradient
        colors={[
          `rgba(${accentRgb},0.0)`,
          `rgba(${accentRgb},0.65)`,
          `rgba(${accentRgb},0.0)`,
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.threadCore, { top: THREAD_Y }]}
      />

      {/* ── Thread shimmer — liquid pulse traveling left→right, looping ── */}
      <Animated.View
        pointerEvents="none"
        style={{
          position:     'absolute',
          top:          THREAD_Y - 4,
          left:         Animated.subtract(shimmerX, 20),
          width:        40,
          height:       8,
          borderRadius: 4,
          overflow:     'hidden',
        }}
      >
        <LinearGradient
          colors={['transparent', `rgba(${accentRgb},0.72)`, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* ── Inactive beads ─────────────────────────────────────────────── */}
      {state.routes.map((route, i) => {
        if (i === state.index) return null;
        return (
          <Bead
            key={route.key}
            cx={(i + 0.5) * tabW}
            accentRgb={accentRgb}
          />
        );
      })}

      {/* ── Active droplet — sphere + neck ─────────────────────────────── */}
      <ActiveDrop cx={dropX} accentRgb={accentRgb} />

      {/* ── Labels — always present, fade with active state ─────────────── */}
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
                left:   i * tabW,
                width:  tabW,
                top:    THREAD_Y + BEAD_D / 2 + 5,
                color:  `rgba(${accentRgb},1)`,
                opacity: labelAnims[i].interpolate({
                  inputRange:  [0, 1],
                  outputRange: [0.16, 0.72],
                }),
              },
            ]}
          >
            {label}
          </Animated.Text>
        );
      })}

      {/* ── Tap tiles — transparent, full tab width ─────────────────────── */}
      {state.routes.map((route, i) => (
        <Pressable
          key={route.key}
          style={[styles.tile, { left: i * tabW, width: tabW }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const event = navigation.emit({
              type:              'tabPress',
              target:            route.key,
              canPreventDefault: true,
            });
            if (state.index !== i && !event.defaultPrevented) {
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
  thread: {
    position: 'absolute',
    left:     L_PAD,
    right:    R_PAD,
    height:   2.5,  // glow halo
    marginTop: -0.75,
  },
  threadCore: {
    position: 'absolute',
    left:     L_PAD,
    right:    R_PAD,
    height:   1.0,  // sharp bright center
    marginTop: 0,
  },
  beadSpecular: {
    position:     'absolute',
    top:          BEAD_D * 0.18,
    left:         BEAD_D * 0.18,
    width:        BEAD_D * 0.32,
    height:       BEAD_D * 0.22,
    borderRadius: BEAD_D * 0.12,
    backgroundColor: 'rgba(255,255,255,0.48)',
  },
  dropSpecular: {
    position:     'absolute',
    top:          DROP_H * 0.14,
    left:         DROP_W * 0.16,
    width:        DROP_W * 0.34,
    height:       DROP_H * 0.20,
    borderRadius: DROP_W * 0.16,
    backgroundColor: 'rgba(255,255,255,0.60)',
  },
  dropGleam: {
    position:     'absolute',
    top:          DROP_H * 0.10,
    left:         DROP_W * 0.38,
    width:        2.5,
    height:       2.5,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  label: {
    position:      'absolute',
    textAlign:     'center',
    fontFamily:    'CourierPrime',
    fontSize:      8,
    letterSpacing: 1.4,
    textTransform: 'lowercase',
  },
  tile: {
    position: 'absolute',
    top:      0,
    height:   BAR_H,
  },
});
