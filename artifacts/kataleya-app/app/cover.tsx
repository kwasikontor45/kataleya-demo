// app/cover.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The 2am screen. Darkness, rain, the ring breathing.
// No text. No menu. No timer. Just presence.
// Tap anywhere to return.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useRef, useEffect } from 'react';
import {
  View, StyleSheet, TouchableOpacity, Animated,
  Easing, Dimensions, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useCircadian } from '@/hooks/useCircadian';
import { OuroborosRing } from '@/components/OuroborosRing';
import { useSobriety } from '@/hooks/useSobriety';

const { width: W, height: H } = Dimensions.get('window');
const ORB      = Math.min(W * 0.48, 200);
const RING_SIZE = ORB * 1.5;

// ── Rain — same as before, void only ─────────────────────────────────────────
function RainLayer({ accentRgb, count, maxOpacity }: {
  accentRgb: string; count: number; maxOpacity: number;
}) {
  const anims = useRef(
    Array.from({ length: count }, () => new Animated.Value(Math.random()))
  ).current;

  useEffect(() => {
    anims.forEach((anim, i) => {
      const drift = () => {
        anim.setValue(0);
        Animated.timing(anim, {
          toValue:         1,
          duration:        8000 + Math.random() * 10000,
          useNativeDriver: true,
          easing:          Easing.linear,
          delay:           i * 280,
        }).start(({ finished }) => { if (finished) drift(); });
      };
      drift();
    });
    return () => anims.forEach(a => a.stopAnimation());
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((anim, i) => {
        const x     = (i / count) * W + (W / (count * 2));
        const lineH = 24 + Math.random() * 80;
        const op    = (0.3 + Math.random() * 0.7) * maxOpacity;
        return (
          <Animated.View
            key={i}
            style={{
              position:        'absolute',
              left:            x,
              width:           0.6,
              height:          lineH,
              backgroundColor: `rgba(${accentRgb}, ${op})`,
              transform:       [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-lineH, H + lineH] }) }],
            }}
          />
        );
      })}
    </View>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function CoverScreen() {
  const router  = useRouter();
  const { theme, phase } = useCircadian();
  const { sobriety } = useSobriety();

  const accentRgb = phase === 'night'      ? '138,95,224'
                  : phase === 'goldenHour' ? '255,107,53'
                  : '0,212,170';

  const phaseMultiplier = phase === 'goldenHour' ? 0.55 : 1.0;

  // Single orb scale — everything breathes together, no chaos
  const orbScale = useRef(new Animated.Value(1)).current;
  // Single glyph opacity — gentle, unified, native driver safe
  const glyphAnim = useRef(new Animated.Value(0.28)).current;

  // ..: :..
  const GLYPH_CHARS = ['.', '.', ':', ' ', ':', '.', '.'];

  useEffect(() => {
    // Both on native driver — clean, no JS thread load
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, { toValue: 1.055, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orbScale, { toValue: 1.000, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glyphAnim, { toValue: 0.82, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glyphAnim, { toValue: 0.22, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    return () => {
      orbScale.stopAnimation();
      glyphAnim.stopAnimation();
    };
  }, []);

  return (
    <TouchableOpacity
      style={styles.root}
      activeOpacity={1}
      onPress={() => router.back()}
    >
      <StatusBar barStyle="light-content" backgroundColor="#050508" />

      {/* Rain — intensity by phase */}
      {phase === 'night'      && <RainLayer accentRgb={accentRgb} count={18} maxOpacity={0.065} />}
      {phase === 'goldenHour' && <RainLayer accentRgb={accentRgb} count={8}  maxOpacity={0.025} />}
      {phase === 'dawn'       && <RainLayer accentRgb={accentRgb} count={4}  maxOpacity={0.018} />}

      {/* Central composition */}
      <View style={styles.center} pointerEvents="none">

        {/* Ambient glow — barely there, breathes with scale */}
        <Animated.View style={[styles.absolute, {
          width:           RING_SIZE * 1.1,
          height:          RING_SIZE * 1.1,
          borderRadius:    RING_SIZE * 0.55,
          backgroundColor: `rgba(${accentRgb}, ${0.018 * phaseMultiplier})`,
          transform:       [{ scale: orbScale }],
        }]} />

        {/* OuroborosRing — the snake, halo in space */}
        <View style={[styles.absolute, {
          width:     RING_SIZE,
          height:    RING_SIZE,
          transform: [{ perspective: 600 }, { rotateX: '-12deg' }],
        }]}>
          <OuroborosRing
            size={RING_SIZE}
            color={theme.accent}
            cycleCount={sobriety.daysSober}
            phase={phase as any}
            breathing={false}
          />
        </View>

        {/* Dark hollow — the void inside the ring */}
        <Animated.View style={[styles.absolute, {
          width:           ORB * 0.78,
          height:          ORB * 0.78,
          borderRadius:    ORB * 0.39,
          backgroundColor: 'rgba(2,3,5,0.92)',
          transform:       [{ scale: orbScale }],
        }]} />

        {/* ..: :.. — breathing, not performing */}
        <Animated.View style={[styles.absolute, { transform: [{ scale: orbScale }] }]}>
          <View style={styles.glyphRow}>
            {GLYPH_CHARS.map((ch, i) => (
              <Animated.Text
                key={i}
                style={[
                  styles.glyphChar,
                  {
                    color:   `rgba(${accentRgb}, 1)`,
                    opacity: i === 3 ? 0.06 : glyphAnim,
                  },
                ]}
              >
                {ch}
              </Animated.Text>
            ))}
          </View>
        </Animated.View>

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
    position:        'absolute',
    alignItems:      'center',
    justifyContent:  'center',
  },
  glyphRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           2,
  },
  glyphChar: {
    fontFamily:    'SpaceMono',
    fontSize:      26,
    letterSpacing: 3,
  },
});
