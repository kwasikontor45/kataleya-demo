// app/cover.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The 2am screen. Someone is already here.
//
// Almost nothing. Orb breathing in the dark.
// One line already present — like a light left on.
// Tap for a phrase. Return when ready.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, Animated,
  Easing, Dimensions, Platform, StatusBar,
} from 'react-native';
import { ScanlineLayer } from '@/components/scanline-layer';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCircadian } from '@/hooks/useCircadian';
import { useSobriety } from '@/hooks/useSobriety';

const { width: W, height: H } = Dimensions.get('window');
const ORB = Math.min(W * 0.48, 200);
const RING_SIZE = ORB * 1.5;

// ── Presence lines — already there when they arrive, like a light left on ─────
// One line per phase. Not typed. Not triggered. Just present.
const PRESENCE: Record<string, string> = {
  void:    'someone is already here.',
  desire:  'someone is already here.',
  renewal: 'someone is already here.',
  choice:  'someone is already here.',
};

// ── Tap phrases — only appear after first tap, garden language ────────────────
const PHRASES: Record<string, string[]> = {
  void: [
    'the garden doesn\u2019t judge the winter.',
    'you opened this instead.\nthat is enough.',
    'nothing is required of you\nright now.',
    'this is the hard hour.\nyou are not alone in it.',
    'rest is not surrender.\nit is preparation.',
    'even in winter,\nthe roots hold.',
    'the night always ends\nat the same place \u2014 morning.',
  ],
  desire: [
    'this feeling has a lifespan.\noutlast it.',
    'you have been here before.\nyou have left before.',
    'between one self and the next.\nhold.',
    'the garden knows\nwhat season this is.',
  ],
  renewal: [
    'you made it to morning.\nthat counts.',
    'something held last night.\nthat was you.',
    'another day begins.\nyou are in it.',
  ],
  choice: [
    'even now, something is growing.',
    'the work continues.\nso do you.',
    'you are here.\nthat is enough.',
  ],
};

function getOuroborosPhase(phase: string): string {
  if (phase === 'night')      return 'void';
  if (phase === 'goldenHour') return 'desire';
  if (phase === 'dawn')       return 'renewal';
  return 'choice';
}

function getPhrase(phase: string, lastIdx: number): { text: string; index: number } {
  const pool = PHRASES[getOuroborosPhase(phase)];
  let idx = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && idx === lastIdx) idx = (idx + 1) % pool.length;
  return { text: pool[idx], index: idx };
}

// ── Rain layer — Blade Runner vertical drifts, intensity follows circadian ────
function RainLayer({ accentRgb, count, maxOpacity }: {
  accentRgb: string;
  count: number;
  maxOpacity: number;
}) {
  const anims = useRef(
    Array.from({ length: count }, () => new Animated.Value(Math.random()))
  ).current;

  useEffect(() => {
    anims.forEach((anim, i) => {
      const drift = () => {
        anim.setValue(0);
        Animated.timing(anim, {
          toValue: 1,
          duration: 8000 + Math.random() * 10000,
          useNativeDriver: true,
          easing: Easing.linear,
          delay: i * 280,
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
              position: 'absolute',
              left: x,
              width: 0.6,
              height: lineH,
              backgroundColor: `rgba(${accentRgb}, ${op})`,
              transform: [{
                translateY: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-lineH, H + lineH],
                }),
              }],
            }}
          />
        );
      })}
    </View>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function CoverScreen() {
  const router = useRouter();
  const { theme, phase } = useCircadian();
  const { sobriety } = useSobriety();

  const accentRgb = phase === 'night'      ? '138,95,224'
                  : phase === 'goldenHour' ? '255,107,53'
                  : '0,212,170';

  const phaseMultiplier = phase === 'goldenHour' ? 0.55 : 1.0;
  const ouroborosPhase  = getOuroborosPhase(phase);

  const orbScale        = useRef(new Animated.Value(1)).current;
  const presenceOpacity = useRef(new Animated.Value(0)).current;
  const phraseOpacity   = useRef(new Animated.Value(0)).current;
  const returnOpacity   = useRef(new Animated.Value(0)).current;

  const [tapPhrase, setTapPhrase]   = useState<string | null>(null);
  const [tapVisible, setTapVisible] = useState(false);
  const lastPhraseIdx = useRef(-1);
  const phraseTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Orb breathing — slow, like someone already asleep and waiting
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, { toValue: 1.055, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orbScale, { toValue: 1.000, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Presence line — fades in after 1.2s, already there, like a light left on
    const presenceTimer = setTimeout(() => {
      Animated.timing(presenceOpacity, {
        toValue: 1, duration: 2200,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.sin),
      }).start();
    }, 1200);

    // Return — fades in after 10s
    const returnTimer = setTimeout(() => {
      Animated.timing(returnOpacity, {
        toValue: 1, duration: 1800,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.sin),
      }).start();
    }, 10000);

    return () => {
      clearTimeout(presenceTimer);
      clearTimeout(returnTimer);
      orbScale.stopAnimation();
    };
  }, []);

  const handleTap = useCallback(() => {
    if (tapVisible) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { text, index } = getPhrase(phase, lastPhraseIdx.current);
    lastPhraseIdx.current = index;
    setTapPhrase(text);
    phraseOpacity.setValue(0);
    Animated.timing(phraseOpacity, {
      toValue: 1, duration: 1000,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.sin),
    }).start();
    setTapVisible(true);

    if (phraseTimer.current) clearTimeout(phraseTimer.current);
    phraseTimer.current = setTimeout(() => {
      Animated.timing(phraseOpacity, {
        toValue: 0, duration: 2000,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.sin),
      }).start(() => { setTapVisible(false); setTapPhrase(null); });
    }, 5000);
  }, [phase, tapVisible]);

  const handleReturn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };


  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#050508" />

      {/* Rain — void only, very quiet */}
      {phase === 'night' && <RainLayer accentRgb={accentRgb} count={14} maxOpacity={0.05} />}

      {/* Scanlines — barely there */}
      <ScanlineLayer />

      {/* Central orb — tap for a phrase */}
      <TouchableOpacity onPress={handleTap} activeOpacity={1} hitSlop={40} style={styles.center}>

        {/* Single soft glow pool — the warmth behind the light */}
        <Animated.View pointerEvents="none" style={[styles.absolute, {
          width: ORB * 2.6, height: ORB * 2.6, borderRadius: ORB * 1.3,
          backgroundColor: `rgba(${accentRgb}, ${0.03 * phaseMultiplier})`,
          transform: [{ scale: orbScale }],
        }]} />

        {/* Orb */}
        <Animated.View style={[styles.orb, {
          width: ORB, height: ORB,
          borderRadius: ORB / 2,
          borderColor: `rgba(${accentRgb}, 0.22)`,
          backgroundColor: `rgba(${accentRgb}, 0.03)`,
          transform: [{ scale: orbScale }],
        }]}>
          <Image
            source={require('../assets/images/butterfly-dna-t.gif')}
            style={{ width: ORB * 0.62, height: ORB * 0.62, opacity: 0.82 }}
            resizeMode="contain"
          />
        </Animated.View>

      </TouchableOpacity>

      {/* Presence line — already there. like a light left on. */}
      <Animated.Text style={[styles.presenceLine, {
        color: `rgba(${accentRgb}, ${0.72 * phaseMultiplier})`,
        opacity: presenceOpacity,
      }]}>
        {PRESENCE[ouroborosPhase]}
      </Animated.Text>

      {/* Tap phrase — fades in on tap, fades out after 5s */}
      <Animated.View style={[styles.phraseWrap, { opacity: phraseOpacity }]}>
        {tapPhrase && (
          <Text style={[styles.phraseText, { color: `rgba(${accentRgb}, ${0.55 * phaseMultiplier})` }]}>
            {tapPhrase}
          </Text>
        )}
      </Animated.View>

      {/* Return — appears after 10s */}
      <Animated.View style={[styles.returnWrap, { opacity: returnOpacity }]}>
        <TouchableOpacity onPress={handleReturn} hitSlop={16}>
          <Text style={[styles.returnText, { color: `rgba(${accentRgb}, ${0.22 * phaseMultiplier})` }]}>
            return when ready
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Wordmark — barely visible */}
      <Text style={[styles.wordmark, { color: `rgba(${accentRgb}, 0.05)` }]}>
        kataleya
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050508',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presenceLine: {
    position: 'absolute',
    bottom: H * 0.28,
    fontFamily: 'CourierPrime',
    fontSize: 15,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  center: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  absolute: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orb: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phraseWrap: {
    position: 'absolute',
    bottom: H * 0.20,
    left: 40,
    right: 40,
    alignItems: 'center',
  },
  phraseText: {
    fontFamily: 'CourierPrime',
    fontSize: 17,
    lineHeight: 28,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  returnWrap: {
    position: 'absolute',
    bottom: H * 0.10,
    alignItems: 'center',
  },
  returnText: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 2.5,
    textTransform: 'lowercase',
  },
  wordmark: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 48 : 32,
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 6,
    textTransform: 'lowercase',
  },
});
