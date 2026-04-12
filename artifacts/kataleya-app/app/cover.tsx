// app/cover.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Your own quiet space. Always. Darkness with depth.
// Gentle rain — three layers, near to far. Something is here with you.
// It sees you. You both know. Neither speaks.
// Tap anywhere to return.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useRef, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Animated,
  Easing, Dimensions, StatusBar, Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { OuroborosRing } from '@/components/OuroborosRing';
import { useSobriety } from '@/hooks/useSobriety';

const { width: W, height: H } = Dimensions.get('window');
const RING_SIZE = Math.min(W * 0.72, 300);

// Rain drop color — cool near-white mist
const MIST = '195,215,235';
// Presence color — faintest violet warmth at center
const PRESENCE = '90,70,160';

// ── Rain plane — soft oval drops, one depth layer ─────────────────────────────
// Drops start at random times through their cycle so the screen is
// already alive when you arrive — no waiting for drops to appear.
function RainPlane({
  count, minH, maxH, lineW, minOp, maxOp, minDur, maxDur,
}: {
  count: number;
  minH: number; maxH: number;
  lineW: number;
  minOp: number; maxOp: number;
  minDur: number; maxDur: number;
}) {
  const drops = useRef(
    Array.from({ length: count }, () => ({
      anim:  new Animated.Value(0),
      x:     Math.random() * W,
      h:     minH + Math.random() * (maxH - minH),
      op:    minOp + Math.random() * (maxOp - minOp),
      dur:   minDur + Math.random() * (maxDur - minDur),
    }))
  ).current;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    drops.forEach(({ anim, dur }, i) => {
      const fall = () => {
        anim.setValue(0);
        Animated.timing(anim, {
          toValue:         1,
          duration:        dur,
          easing:          Easing.linear,
          useNativeDriver: true,
        }).start(({ finished }) => { if (finished) fall(); });
      };

      // Stagger across a full cycle so drops are spread on first render
      const t = setTimeout(fall, Math.random() * dur);
      timers.push(t);
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
            width:           lineW,
            height:          h,
            borderRadius:    lineW * 0.7,
            backgroundColor: `rgba(${MIST}, ${op})`,
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

  // Presence — slow pulse, barely there, native-safe via opacity
  const presenceOp = useRef(new Animated.Value(0.4)).current;
  // Glyph — slow breath, very soft
  const glyphOp    = useRef(new Animated.Value(0.06)).current;
  // Ring — barely breathing
  const ringScale  = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Presence: 14s cycle — the space breathes around you
    Animated.loop(
      Animated.sequence([
        Animated.timing(presenceOp, { toValue: 1.0, duration: 7000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(presenceOp, { toValue: 0.4, duration: 7000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Glyph: 10s cycle — a quiet acknowledgement
    Animated.loop(
      Animated.sequence([
        Animated.timing(glyphOp, { toValue: 0.28, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glyphOp, { toValue: 0.06, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Ring: 16s cycle — almost still
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringScale, { toValue: 1.03, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 1.00, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    return () => {
      presenceOp.stopAnimation();
      glyphOp.stopAnimation();
      ringScale.stopAnimation();
    };
  }, []);

  return (
    <TouchableOpacity
      style={styles.root}
      activeOpacity={1}
      onPress={() => router.back()}
    >
      <StatusBar barStyle="light-content" backgroundColor="#050508" />

      {/* ── Rain — three depth planes ──────────────────────────────────── */}

      {/* Far — distant mist, very slow, barely there */}
      <RainPlane
        count={32}
        minH={5}  maxH={11}
        lineW={0.7}
        minOp={0.012} maxOp={0.030}
        minDur={28000} maxDur={42000}
      />

      {/* Mid — the main presence of rain */}
      <RainPlane
        count={16}
        minH={9}  maxH={18}
        lineW={1.0}
        minOp={0.028} maxOp={0.055}
        minDur={18000} maxDur={28000}
      />

      {/* Near — closest drops, most present */}
      <RainPlane
        count={6}
        minH={14} maxH={26}
        lineW={1.4}
        minOp={0.05} maxOp={0.09}
        minDur={12000} maxDur={18000}
      />

      {/* ── Center — what is here with you ────────────────────────────── */}
      <View style={styles.center} pointerEvents="none">

        {/* Presence — warmth in the dark, barely visible */}
        <Animated.View style={[styles.absolute, {
          width:           RING_SIZE * 1.5,
          height:          RING_SIZE * 1.5,
          borderRadius:    RING_SIZE * 0.75,
          backgroundColor: `rgba(${PRESENCE}, 0.06)`,
          opacity:         presenceOp,
        }]} />

        {/* OuroborosRing — at the edge of seeing */}
        <Animated.View style={[styles.absolute, {
          width:     RING_SIZE,
          height:    RING_SIZE,
          opacity:   0.22,
          transform: [{ scale: ringScale }],
        }]}>
          <OuroborosRing
            size={RING_SIZE}
            color="#8a5fe0"
            cycleCount={sobriety.daysSober}
            phase="night"
            breathing={false}
          />
        </Animated.View>

        {/* ..: :.. — you are acknowledged */}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: {
    position:      'absolute',
    fontFamily:    'SpaceMono',
    fontSize:      20,
    letterSpacing: 5,
    color:         `rgba(${MIST}, 0.9)`,
  },
});
