'use no memo';
/**
 * HoldToConfirm
 *
 * A single hold-gesture button used across the three confirmation-weight
 * actions in Kataleya: mood log, journal seal, and burn ritual.
 *
 * Props
 * ─────
 * label         — text shown at rest
 * holdingLabel  — text shown while the user is holding (optional)
 * duration      — ms to hold before onConfirm fires (default 1200)
 * accentRgb     — RGB triplet string e.g. '127,201,201'
 * dangerMode    — if true, uses a red fill + warning haptic pattern
 * disabled      — blocks the hold gesture entirely
 * onConfirm     — called once when the hold completes
 * style         — additional ViewStyle on the outer wrapper
 */

import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';

// Danger mode colours — used for burn ritual
const DANGER_RGB = '255,80,80';

interface Props {
  label: string;
  holdingLabel?: string;
  duration?: number;
  accentRgb: string;
  dangerMode?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  style?: ViewStyle;
}

export function HoldToConfirm({
  label,
  holdingLabel,
  duration = 1200,
  accentRgb,
  dangerMode = false,
  disabled = false,
  onConfirm,
  style,
}: Props) {
  const progress  = useRef(new Animated.Value(0)).current;
  const animRef   = useRef<Animated.CompositeAnimation | null>(null);
  const firedRef  = useRef(false);
  const holdingRef = useRef(false);

  // Track holding state via a separate animated value so we can
  // drive the label and fill color without React re-renders every frame.
  const holdingAnim = useRef(new Animated.Value(0)).current;

  const fillRgb = dangerMode ? DANGER_RGB : accentRgb;

  const startHold = useCallback(() => {
    if (disabled || firedRef.current) return;
    holdingRef.current = true;
    firedRef.current = false;
    holdingAnim.setValue(1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    animRef.current = Animated.timing(progress, {
      toValue: 100,
      duration,
      useNativeDriver: false,
    });

    animRef.current.start(({ finished }) => {
      if (finished && holdingRef.current) {
        firedRef.current = true;
        Haptics.notificationAsync(
          dangerMode
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Success
        );
        onConfirm();
        // Reset after a brief moment
        setTimeout(() => {
          holdingAnim.setValue(0);
          Animated.timing(progress, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }).start();
        }, 250);
      }
    });
  }, [disabled, duration, dangerMode, onConfirm, progress, holdingAnim]);

  const endHold = useCallback(() => {
    if (firedRef.current) return;
    holdingRef.current = false;
    holdingAnim.setValue(0);
    animRef.current?.stop();
    Animated.timing(progress, {
      toValue: 0,
      duration: 320,
      useNativeDriver: false,
    }).start();
  }, [progress, holdingAnim]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  // Pulse opacity — dims slightly while holding to signal liveness
  const btnOpacity = holdingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.88],
  });

  return (
    <View style={[styles.wrapper, style]}>
      {/* Progress track — sits above the button */}
      <View style={[styles.track, { backgroundColor: `rgba(${fillRgb}, 0.12)` }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              width: progressWidth,
              backgroundColor: `rgba(${fillRgb}, ${dangerMode ? 0.65 : 0.55})`,
            },
          ]}
        />
      </View>

      <TouchableOpacity
        onPressIn={startHold}
        onPressOut={endHold}
        disabled={disabled}
        activeOpacity={1}
        delayLongPress={0}
      >
        <Animated.View
          style={[
            styles.btn,
            {
              borderColor: disabled
                ? `rgba(${fillRgb}, 0.12)`
                : `rgba(${fillRgb}, ${dangerMode ? 0.5 : 0.38})`,
              backgroundColor: `rgba(${fillRgb}, ${disabled ? 0 : dangerMode ? 0.08 : 0.05})`,
              opacity: disabled ? 0.35 : btnOpacity,
            },
          ]}
        >
          <Text
            style={[
              styles.label,
              { color: `rgba(${fillRgb}, ${disabled ? 0.4 : 0.88})` },
            ]}
          >
            {holdingLabel ?? label}
          </Text>
          <Text style={[styles.hint, { color: `rgba(${fillRgb}, 0.35)` }]}>
            hold
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', gap: 0 },
  track: {
    width: '100%',
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
    marginBottom: 0,
  },
  fill: { height: '100%', borderRadius: 1 },
  btn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'lowercase',
  },
  hint: {
    fontFamily: 'CourierPrime',
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'lowercase',
  },
});
