// hooks/useDepthPress.ts
// ─────────────────────────────────────────────────────────────────────────────
// Press-depth animation. Every interactive element in the app uses this to
// push INTO the screen on press-in and spring back on press-out.
//
// Usage:
//   const { handlers, depthStyle } = useDepthPress();
//   <Pressable {...handlers}>
//     <Animated.View style={[yourStyle, depthStyle]} />
//   </Pressable>
// ─────────────────────────────────────────────────────────────────────────────

import { useRef, useCallback } from 'react';
import { Animated, Easing } from 'react-native';

interface DepthPressOptions {
  /** Scale at full press. Default 0.962 */
  pressedScale?: number;
  /** Shadow opacity at full press (reduced to suggest depth). Default 0.06 */
  pressedShadowOpacity?: number;
  /** Spring back speed in ms. Default 260 */
  releaseMs?: number;
}

export function useDepthPress(opts: DepthPressOptions = {}) {
  const {
    pressedScale         = 0.962,
    pressedShadowOpacity = 0.06,
    releaseMs            = 260,
  } = opts;

  const scale   = useRef(new Animated.Value(1)).current;
  const shadowO = useRef(new Animated.Value(0.15)).current;

  const pressIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue:         pressedScale,
        duration:        80,
        easing:          Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(shadowO, {
        toValue:         pressedShadowOpacity,
        duration:        80,
        useNativeDriver: false,
      }),
    ]).start();
  }, [pressedScale, pressedShadowOpacity]);

  const pressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue:         1,
        friction:        5,
        tension:         180,
        useNativeDriver: true,
      }),
      Animated.timing(shadowO, {
        toValue:         0.15,
        duration:        releaseMs,
        easing:          Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  }, [releaseMs]);

  const handlers = {
    onPressIn:  pressIn,
    onPressOut: pressOut,
  };

  const depthStyle = {
    transform:      [{ scale }],
    shadowOpacity:  shadowO,
  };

  return { handlers, depthStyle, scale, shadowOpacity: shadowO };
}
