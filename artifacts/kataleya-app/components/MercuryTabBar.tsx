// components/MercuryTabBar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Mercury tab bar — a single continuous line that bends at the active tab.
// No droplets. No beads. No shimmer. Just the line, curved at the selection.
// Labels fade between active and inactive. Long press fires easter egg.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import {
  View, Pressable, StyleSheet, Dimensions,
  Animated, Easing,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width: W } = Dimensions.get('window');

const BAR_H    = 52;
const THREAD_Y = 36;   // line Y position from top of bar
const DIP_D    = 10;   // how far the line curves down at the active tab
const L_PAD    = 18;
const R_PAD    = 18;

// ── Path builder — thin line with quadratic bezier dip at active tab ──────────
function buildPath(activeIndex: number, n: number): string {
  const tabW = W / n;
  const cx   = (activeIndex + 0.5) * tabW;
  const dw   = tabW * 0.55;   // dip width — proportional to tab slot
  const ty   = THREAD_Y;
  return [
    `M ${L_PAD} ${ty}`,
    `L ${cx - dw / 2} ${ty}`,
    `Q ${cx} ${ty + DIP_D} ${cx + dw / 2} ${ty}`,
    `L ${W - R_PAD} ${ty}`,
  ].join(' ');
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

  const path = buildPath(state.index, n);

  return (
    <View style={[styles.container, { height: BAR_H + insets.bottom }]}>

      {/* ── Thread — a line with a curve at the active tab ─────────────── */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width={W} height={BAR_H}>
          {/* Glow halo */}
          <Path
            d={path}
            stroke={`rgba(${accentRgb}, 0.30)`}
            strokeWidth={3}
            fill="none"
          />
          {/* Mid body */}
          <Path
            d={path}
            stroke={`rgba(${accentRgb}, 0.55)`}
            strokeWidth={1.2}
            fill="none"
          />
          {/* Bright core */}
          <Path
            d={path}
            stroke={`rgba(${accentRgb}, 0.90)`}
            strokeWidth={0.5}
            fill="none"
          />
        </Svg>
      </View>

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
                left:    i * tabW,
                width:   tabW,
                top:     THREAD_Y + DIP_D + 6,
                color:   `rgba(${accentRgb},1)`,
                opacity: labelAnims[i].interpolate({
                  inputRange:  [0, 1],
                  outputRange: [0.14, 0.70],
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
