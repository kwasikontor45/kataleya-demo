// app/cover.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Your quiet space. Always.
// Darkness. Rain. The ring. That's it.
// Tap anywhere to return.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useRef, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Animated,
  Easing, Dimensions, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { OuroborosRing } from '@/components/OuroborosRing';
import { useSobriety } from '@/hooks/useSobriety';

const { width: W, height: H } = Dimensions.get('window');
const RING_SIZE = Math.min(W * 0.65, 280);

// ── Rain layer — thin lines, three depths ─────────────────────────────────────
// Real rain is thin diagonal streaks, not blobs.
function RainLayer({ count, minH, maxH, width, minOp, maxOp, minDur, maxDur }: {
  count: number;
  minH: number; maxH: number;
  width: number;
  minOp: number; maxOp: number;
  minDur: number; maxDur: number;
}) {
  const drops = useRef(
    Array.from({ length: count }, () => ({
      anim: new Animated.Value(0),
      x:    Math.random() * W,
      h:    minH + Math.random() * (maxH - minH),
      op:   minOp + Math.random() * (maxOp - minOp),
      dur:  minDur + Math.random() * (maxDur - minDur),
    }))
  ).current;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    drops.forEach(({ anim, dur }) => {
      const fall = () => {
        anim.setValue(0);
        Animated.timing(anim, {
          toValue:         1,
          duration:        dur,
          easing:          Easing.linear,
          useNativeDriver: true,
        }).start(({ finished }) => { if (finished) fall(); });
      };
      // Spread initial positions across the full cycle
      timers.push(setTimeout(fall, Math.random() * dur));
    });
    return () => {
      timers.forEach(clearTimeout);
      drops.forEach(({ anim }) => anim.stopAnimation());
    };
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {drops.map(({ anim, x, h, op }, i) => (
        <Animated.View
          key={i}
          style={{
            position:        'absolute',
            left:            x,
            width:           width,
            height:          h,
            backgroundColor: `rgba(200,215,230,${op})`,
            transform:       [{
              translateY: anim.interpolate({
                inputRange:  [0, 1],
                outputRange: [-h, H + h],
              }),
            }],
          }}
        />
      ))}
    </View>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function CoverScreen() {
  const router       = useRouter();
  const { sobriety } = useSobriety();

  // Ring — very slow breath
  const ringScale = useRef(new Animated.Value(1)).current;
  // Glyph — slow, soft
  const glyphOp   = useRef(new Animated.Value(0.07)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringScale, { toValue: 1.025, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 1.000, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glyphOp, { toValue: 0.30, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glyphOp, { toValue: 0.07, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    return () => {
      ringScale.stopAnimation();
      glyphOp.stopAnimation();
    };
  }, []);

  return (
    <TouchableOpacity style={styles.root} activeOpacity={1} onPress={() => router.back()}>
      <StatusBar barStyle="light-content" backgroundColor="#050508" />

      {/* ── Rain — distant, mid, close ─────────────────────────────────── */}
      <RainLayer count={30} minH={8}  maxH={18} width={0.5} minOp={0.015} maxOp={0.035} minDur={26000} maxDur={40000} />
      <RainLayer count={14} minH={14} maxH={28} width={0.7} minOp={0.030} maxOp={0.060} minDur={16000} maxDur={26000} />
      <RainLayer count={5}  minH={20} maxH={40} width={0.9} minOp={0.050} maxOp={0.090} minDur={11000} maxDur={17000} />

      {/* ── Ring — visible, not dominant ───────────────────────────────── */}
      <View style={styles.center} pointerEvents="none">
        <Animated.View style={[styles.absolute, { transform: [{ scale: ringScale }] }]}>
          <OuroborosRing
            size={RING_SIZE}
            color="#8a5fe0"
            cycleCount={sobriety.daysSober}
            phase="night"
            breathing={false}
          />
        </Animated.View>

        {/* ..: :.. */}
        <Animated.Text style={[styles.glyph, { opacity: glyphOp }]}>
          ..: :..
        </Animated.Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: '#050508',
    alignItems:      'center',
    justifyContent:  'center',
  },
  center: {
    width:           RING_SIZE,
    height:          RING_SIZE,
    alignItems:      'center',
    justifyContent:  'center',
  },
  absolute: {
    position: 'absolute',
  },
  glyph: {
    position:      'absolute',
    fontFamily:    'SpaceMono',
    fontSize:      18,
    letterSpacing: 5,
    color:         'rgba(200,215,230,0.9)',
  },
});
