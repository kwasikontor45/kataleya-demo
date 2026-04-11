// app/cover.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The 2am screen. The panic screen. The sanctuary.
//
// Aesthetic: lived-in darkness. Not clean sci-fi — textured, warm, breathing.
// Blade Runner rain. EVE Online terminal glow. Cyberpunk neon bleed.
// But always Kataleya — honest, quiet, never demanding.
//
// Architecture:
//   - Scanline texture layer (CRT memory, 2% opacity)
//   - Neon bleed at screen edges (phase color, offscreen light)
//   - Rain layer (void phase only, drifting verticals, 3% opacity)
//   - OuroborosRing (outer, slow, scarred, never closing)
//   - Orb core (butterfly at center, perfectly centered, no tint)
//   - Phrase (tap orb, appears, fades — garden language)
//   - Return (fades in after 8s)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, Animated,
  Easing, Dimensions, Platform, StatusBar,
} from 'react-native';
import Svg, { Line, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCircadian } from '@/hooks/useCircadian';
import { OuroborosRing } from '@/components/OuroborosRing';
import { useSobriety } from '@/hooks/useSobriety';

const { width: W, height: H } = Dimensions.get('window');
const ORB = Math.min(W * 0.48, 200);
const RING_SIZE = ORB * 1.72;

// ── Phrases — garden language, honest, never performative ────────────────────
const PHRASES: Record<string, string[]> = {
  void: [
    '2am always ends.',
    'The garden doesn\u2019t judge the winter.',
    'You opened this instead.\nThat is enough.',
    'Nothing is required of you\nright now.',
    'This is the hard hour.\nYou are not alone in it.',
    'Rest is not surrender.\nIt is preparation.',
    'Even in winter,\nthe roots hold.',
    'The night always ends\nat the same place \u2014 morning.',
  ],
  desire: [
    'Acknowledge it.\nDon\u2019t feed it.',
    'This feeling has a lifespan.\nOutlast it.',
    'You have been here before.\nYou have left before.',
    'Between one self and the next.\nHold.',
    'The garden knows\nwhat season this is.',
  ],
  renewal: [
    'The garden wakes.\nSo do you.',
    'You made it to morning.\nThat counts.',
    'This is what continuation looks like.',
    'Something held last night.\nThat was you.',
    'Another day begins.\nYou are in it.',
  ],
  choice: [
    'The garden is awake.\nSo are you.',
    'This is the window.\nUse it.',
    'Even now, something is growing.',
    'The work continues.\nSo do you.',
    'You are here.\nThat is enough.',
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

// ── Rain layer — void phase, Blade Runner vertical drifts ────────────────────
function RainLayer({ accentRgb }: { accentRgb: string }) {
  const anims = useRef(
    Array.from({ length: 18 }, () => new Animated.Value(Math.random()))
  ).current;

  useEffect(() => {
    anims.forEach((anim, i) => {
      const drift = () => {
        anim.setValue(0);
        Animated.timing(anim, {
          toValue: 1,
          duration: 9000 + Math.random() * 12000,
          useNativeDriver: true,
          easing: Easing.linear,
          delay: i * 350,
        }).start(({ finished }) => { if (finished) drift(); });
      };
      drift();
    });
    return () => anims.forEach(a => a.stopAnimation());
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {anims.map((anim, i) => {
        const x = (i / 18) * W + (W / 36);
        const lineH = 30 + Math.random() * 70;
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: x,
              width: 0.5,
              height: lineH,
              backgroundColor: `rgba(${accentRgb}, 0.05)`,
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

// ── Scanlines — CRT texture ───────────────────────────────────────────────────
function ScanlineLayer() {
  const count = Math.floor(H / 4);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={W} height={H}>
        {Array.from({ length: count }, (_, i) => (
          <Line
            key={i}
            x1={0} y1={i * 4}
            x2={W} y2={i * 4}
            stroke="rgba(0,0,0,0.10)"
            strokeWidth={0.5}
          />
        ))}
      </Svg>
    </View>
  );
}

// ── Neon bleed — phase color bleeding from all four edges ────────────────────
function NeonBleed({ accentRgb }: { accentRgb: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="bT" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={`rgb(${accentRgb})`} stopOpacity="0.07" />
            <Stop offset="0.28" stopColor={`rgb(${accentRgb})`} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="bB" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.72" stopColor={`rgb(${accentRgb})`} stopOpacity="0" />
            <Stop offset="1" stopColor={`rgb(${accentRgb})`} stopOpacity="0.06" />
          </LinearGradient>
          <LinearGradient id="bL" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={`rgb(${accentRgb})`} stopOpacity="0.06" />
            <Stop offset="0.22" stopColor={`rgb(${accentRgb})`} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="bR" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0.78" stopColor={`rgb(${accentRgb})`} stopOpacity="0" />
            <Stop offset="1" stopColor={`rgb(${accentRgb})`} stopOpacity="0.06" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H * 0.32} fill="url(#bT)" />
        <Rect x={0} y={H * 0.68} width={W} height={H * 0.32} fill="url(#bB)" />
        <Rect x={0} y={0} width={W * 0.22} height={H} fill="url(#bL)" />
        <Rect x={W * 0.78} y={0} width={W * 0.22} height={H} fill="url(#bR)" />
      </Svg>
    </View>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function CoverScreen() {
  const router = useRouter();
  const { theme, phase } = useCircadian();
  const { sobriety } = useSobriety();
  const isVoid = phase === 'night';

  const accentRgb = phase === 'night'      ? '138,95,224'
                  : phase === 'goldenHour' ? '255,107,53'
                  : phase === 'dawn'       ? '255,100,180'
                  : '0,212,170';

  const orbScale     = useRef(new Animated.Value(1)).current;
  const orbOpacity   = useRef(new Animated.Value(0.22)).current;
  const ring1Scale   = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.07)).current;
  const ring2Scale   = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0.04)).current;
  const bgGlow       = useRef(new Animated.Value(0)).current;
  const phraseOpacity  = useRef(new Animated.Value(0)).current;
  const returnOpacity  = useRef(new Animated.Value(0)).current;

  const [phrase, setPhrase] = useState<string | null>(null);
  const [phraseVisible, setPhraseVisible] = useState(false);
  const lastPhraseIdx = useRef(-1);
  const phraseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orbScale,     { toValue: 1.06, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(orbOpacity,   { toValue: 0.32, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(ring1Scale,   { toValue: 1.10, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(ring1Opacity, { toValue: 0.14, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(ring2Scale,   { toValue: 1.14, duration: 6200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(ring2Opacity, { toValue: 0.08, duration: 6200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bgGlow,       { toValue: 1,    duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ]),
        Animated.parallel([
          Animated.timing(orbScale,     { toValue: 1,    duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(orbOpacity,   { toValue: 0.22, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(ring1Scale,   { toValue: 1,    duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(ring1Opacity, { toValue: 0.07, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(ring2Scale,   { toValue: 1,    duration: 6200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(ring2Opacity, { toValue: 0.04, duration: 6200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bgGlow,       { toValue: 0,    duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        ]),
      ])
    ).start();

    const t = setTimeout(() => {
      Animated.timing(returnOpacity, {
        toValue: 1, duration: 1400,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.sin),
      }).start();
    }, 8000);

    return () => {
      clearTimeout(t);
      [orbScale, orbOpacity, ring1Scale, ring1Opacity,
       ring2Scale, ring2Opacity, bgGlow].forEach(v => v.stopAnimation());
    };
  }, []);

  const handleTap = useCallback(() => {
    if (phraseVisible) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { text, index } = getPhrase(phase, lastPhraseIdx.current);
    lastPhraseIdx.current = index;
    setPhrase(text);
    phraseOpacity.setValue(0);
    Animated.timing(phraseOpacity, {
      toValue: 1, duration: 1000,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.sin),
    }).start();
    setPhraseVisible(true);
    if (phraseTimer.current) clearTimeout(phraseTimer.current);
    phraseTimer.current = setTimeout(() => {
      Animated.timing(phraseOpacity, {
        toValue: 0, duration: 1600,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.sin),
      }).start(() => { setPhraseVisible(false); setPhrase(null); });
    }, 5500);
  }, [phase, phraseVisible]);

  const handleReturn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const bgColor = bgGlow.interpolate({
    inputRange:  [0, 1],
    outputRange: [`rgba(${accentRgb}, 0.00)`, `rgba(${accentRgb}, 0.05)`],
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#050508" />

      {/* Deep space atmosphere — radial, centered */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.atmosphere,
          {
            backgroundColor: bgColor,
          },
        ]}
      />
      {/* Full screen ambient */}
      <Animated.View pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: bgColor }]} />

      {/* Neon bleed */}
      <NeonBleed accentRgb={accentRgb} />

      {/* Scanlines */}
      <ScanlineLayer />

      {/* Rain — void only */}
      {isVoid && <RainLayer accentRgb={accentRgb} />}

      {/* Phase whisper */}
      <Text style={[styles.phaseWhisper, { color: `rgba(${accentRgb}, 0.18)` }]}>
        {getOuroborosPhase(phase)}
      </Text>

      {/* Central composition */}
      <View style={styles.center}>

        {/* OuroborosRing — outermost, the snake */}
        <View style={[styles.absolute, { width: RING_SIZE, height: RING_SIZE }]}
          pointerEvents="none">
          <OuroborosRing
            size={RING_SIZE}
            color={theme.accent}
            cycleCount={sobriety.daysSober}
            phase={phase as any}
            breathing={false}
            showDots={false}
          />
        </View>

        {/* Breathing ring 2 — outer */}
        <Animated.View pointerEvents="none" style={[styles.ring, {
          width: ORB * 1.52, height: ORB * 1.52,
          borderRadius: ORB * 0.76,
          borderColor: `rgba(${accentRgb}, 1)`,
          transform: [{ scale: ring2Scale }],
          opacity: ring2Opacity,
        }]} />

        {/* Breathing ring 1 — inner */}
        <Animated.View pointerEvents="none" style={[styles.ring, {
          width: ORB * 1.20, height: ORB * 1.20,
          borderRadius: ORB * 0.60,
          borderColor: `rgba(${accentRgb}, 1)`,
          transform: [{ scale: ring1Scale }],
          opacity: ring1Opacity,
        }]} />

        {/* Core orb — tap target, butterfly inside */}
        <TouchableOpacity onPress={handleTap} activeOpacity={1} hitSlop={32}>
          <Animated.View style={[styles.orb, {
            width: ORB, height: ORB,
            borderRadius: ORB / 2,
            borderColor: `rgba(${accentRgb}, 1)`,
            backgroundColor: `rgba(${accentRgb}, 0.05)`,
            transform: [{ scale: orbScale }],
            opacity: orbOpacity,
          }]}>
            {/* Butterfly — centered, embedded in glow */}
            <View style={styles.butterflyGlow}>
              <Image
                source={require('../assets/images/butterfly-dna.gif')}
                style={{ width: ORB * 0.58, height: ORB * 0.58 }}
                resizeMode="contain"
              />
            </View>
          </Animated.View>
        </TouchableOpacity>

      </View>

      {/* Phrase */}
      <Animated.View style={[styles.phraseWrap, { opacity: phraseOpacity }]}>
        {phrase && (
          <Text style={[styles.phraseText, { color: `rgba(${accentRgb}, 0.88)` }]}>
            {phrase}
          </Text>
        )}
      </Animated.View>

      {/* Return */}
      <Animated.View style={[styles.returnWrap, { opacity: returnOpacity }]}>
        <TouchableOpacity onPress={handleReturn} hitSlop={16}>
          <Text style={[styles.returnText, { color: `rgba(${accentRgb}, 0.28)` }]}>
            return when ready
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Wordmark */}
      <Text style={[styles.wordmark, { color: `rgba(${accentRgb}, 0.07)` }]}>
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
  phaseWhisper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 64 : 48,
    fontFamily: 'CourierPrime',
    fontSize: 9,
    letterSpacing: 4,
    textTransform: 'uppercase',
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
  ring: {
    position: 'absolute',
    borderWidth: 1,
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
  butterflyGlow: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  atmosphere: {
    position: 'absolute',
    width: ORB * 3.5,
    height: ORB * 3.5,
    borderRadius: ORB * 1.75,
    alignSelf: 'center',
    top: '50%',
    marginTop: -(ORB * 1.75),
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
