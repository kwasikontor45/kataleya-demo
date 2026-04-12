// components/MercuryTabBar.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Mercury tab bar — one continuous thread that splits into droplets.
// Active tab is the droplet pulled upward by surface tension.
// Nearly invisible at rest, brightens on interaction.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width: W } = Dimensions.get('window');

const TAB_BAR_H   = 60;
const THREAD_H    = 1;
const DROPLET_R   = 5;    // resting droplet radius (circle diameter = R*2)
const LIFT_H      = 22;   // how far active droplet lifts
const LIFT_SCALE  = 1.55; // active droplet size multiplier

// Single droplet — animates between idle and active
function Droplet({
  active,
  accentRgb,
  label,
  onPress,
  onLongPress,
  index,
  total,
}: {
  active: boolean;
  accentRgb: string;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
  index: number;
  total: number;
}) {
  const lift    = useRef(new Animated.Value(active ? 1 : 0)).current;
  const opacity = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(lift, {
        toValue:        active ? 1 : 0,
        friction:       6,
        tension:        60,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue:        active ? 1 : 0,
        duration:       220,
        easing:         Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [active]);

  const translateY = lift.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, -LIFT_H],
  });

  const scale = lift.interpolate({
    inputRange:  [0, 1],
    outputRange: [1, LIFT_SCALE],
  });

  // Glow halo fades in with the lift
  const glowOpacity = lift.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, 0.28],
  });

  // Label fades in above the lifted droplet
  const labelOpacity = lift.interpolate({
    inputRange:  [0, 0.6, 1],
    outputRange: [0, 0,   1],
  });

  const hitW = W / total;

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onLongPress={onLongPress}
      hitSlop={8}
      style={[styles.dropletHit, { width: hitW }]}
    >
      {/* Label above droplet — only visible when active */}
      <Animated.Text
        style={[
          styles.label,
          { color: `rgb(${accentRgb})`, opacity: labelOpacity },
        ]}
      >
        {label}
      </Animated.Text>

      {/* Glow halo */}
      <Animated.View
        style={[
          styles.halo,
          {
            width:           DROPLET_R * 2 * LIFT_SCALE * 4,
            height:          DROPLET_R * 2 * LIFT_SCALE * 4,
            borderRadius:    DROPLET_R * LIFT_SCALE * 4,
            backgroundColor: `rgba(${accentRgb}, 0.0)`,
            shadowColor:     `rgb(${accentRgb})`,
            opacity:         glowOpacity,
            transform:       [{ translateY }, { scale }],
          },
        ]}
      />

      {/* Droplet body */}
      <Animated.View
        style={[
          styles.droplet,
          {
            width:           DROPLET_R * 2,
            height:          DROPLET_R * 2,
            borderRadius:    DROPLET_R,
            backgroundColor: `rgb(${accentRgb})`,
            shadowColor:     `rgb(${accentRgb})`,
            opacity:         opacity.interpolate({
              inputRange:  [0, 1],
              outputRange: [0.3, 1],
            }),
            transform: [{ translateY }, { scale }],
          },
        ]}
      />
    </Pressable>
  );
}

// ── Mercury tab bar ────────────────────────────────────────────────────────────
export function MercuryTabBar({
  state,
  descriptors,
  navigation,
  accentRgb,
  onLongPress,
}: BottomTabBarProps & { accentRgb: string; onLongPress: () => void }) {
  const insets = useSafeAreaInsets();

  // Thread fill — animated to active tab position
  const fillPos = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(fillPos, {
      toValue:         state.index,
      friction:        7,
      tension:         50,
      useNativeDriver: false, // drives width — needs JS driver
    }).start();
  }, [state.index]);

  const tabW = W / state.routes.length;

  // Thread fill width tracks active tab — like mercury pooling toward it
  const fillWidth = fillPos.interpolate({
    inputRange:  state.routes.map((_, i) => i),
    outputRange: state.routes.map((_, i) => tabW * i + tabW * 0.5),
  });

  const totalH = TAB_BAR_H + insets.bottom;

  return (
    <View style={[styles.container, { height: totalH }]}>
      {/* Mercury thread — the full width line */}
      <View style={styles.threadRow}>
        {/* Background thread */}
        <View
          style={[
            styles.thread,
            { backgroundColor: `rgba(${accentRgb}, 0.18)` },
          ]}
        />
        {/* Filled section — mercury pool trailing to active tab */}
        <Animated.View
          style={[
            styles.threadFill,
            {
              width:           fillWidth,
              backgroundColor: `rgba(${accentRgb}, 0.55)`,
              shadowColor:     `rgb(${accentRgb})`,
            },
          ]}
        />
      </View>

      {/* Droplets */}
      <View style={styles.droplets}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name;
          const active = state.index === index;

          return (
            <Droplet
              key={route.key}
              active={active}
              accentRgb={accentRgb}
              label={label}
              index={index}
              total={state.routes.length}
              onPress={() => {
                const event = navigation.emit({
                  type:       'tabPress',
                  target:     route.key,
                  canPreventDefault: true,
                });
                if (!active && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={onLongPress}
            />
          );
        })}
      </View>

      {/* Safe area spacer */}
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
    backgroundColor: 'rgba(5,5,8,0.85)',
    zIndex:          100,
  },
  threadRow: {
    position: 'relative',
    height:   THREAD_H + 4, // glow layer above thread
    marginTop: 8,
  },
  thread: {
    position: 'absolute',
    top:      4,
    left:     24,
    right:    24,
    height:   THREAD_H,
  },
  threadFill: {
    position:    'absolute',
    top:         4,
    left:        24,
    height:      THREAD_H,
    shadowOpacity: 1,
    shadowRadius:  4,
    shadowOffset:  { width: 0, height: 0 },
    elevation:     4,
  },
  droplets: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-around',
    flex:           1,
    paddingBottom:  Platform.OS === 'ios' ? 0 : 4,
  },
  dropletHit: {
    alignItems:     'center',
    justifyContent: 'center',
    height:         TAB_BAR_H - 20,
    position:       'relative',
  },
  droplet: {
    shadowOpacity: 0.9,
    shadowRadius:  8,
    shadowOffset:  { width: 0, height: 0 },
    elevation:     8,
  },
  halo: {
    position:   'absolute',
    shadowOpacity: 1,
    shadowRadius:  16,
    shadowOffset:  { width: 0, height: 0 },
    elevation:     0,
  },
  label: {
    position:      'absolute',
    top:           -28,
    fontFamily:    'SpaceMono',
    fontSize:      8,
    letterSpacing: 1.8,
    textTransform: 'lowercase',
  },
});
