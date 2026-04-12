// app/cover.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The 2am screen. The panic screen. The meditation space.
//
// Someone is already here — presence line fades in, already waiting.
// The orb breathes. The ring turns slowly. Rain falls in the void.
// Phase words cycle — a word to hold during meditation.
// Tap the orb for a phrase. Stay as long as needed.
// Return when ready.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Easing, Dimensions, Platform, StatusBar,
} from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { ScanlineLayer } from '@/components/scanline-layer';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCircadian } from '@/hooks/useCircadian';
import { TypewriterText } from '@/components/typewriter-text';
import { OuroborosRing } from '@/components/OuroborosRing';
import { useSobriety } from '@/hooks/useSobriety';

const { width: W, height: H } = Dimensions.get('window');
const ORB = Math.min(W * 0.48, 200);
const RING_SIZE = ORB * 1.5;

// ── Presence line — already there when they arrive ────────────────────────────
const PRESENCE = 'someone is already here.';

// ── Meditation words — a word to hold, cycles slowly ─────────────────────────
const PHASE_WORDS: Record<string, string[]> = {
  void:    ['hold.', 'rest.', 'breathe.', 'stay.'],
  desire:  ['hold.', 'outlast.', 'breathe.', 'wait.'],
  renewal: ['begin.', 'breathe.', 'continue.', 'stay.'],
  choice:  ['breathe.', 'choose.', 'continue.', 'hold.'],
};

// ── Tap phrases — garden language, revealed on tap ───────────────────────────
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

// ── Rain — Blade Runner vertical drifts ──────────────────────────────────────
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
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-lineH, H + lineH] }) }],
            }}
          />
        );
      })}
    </View>
  );
}

// ── Neon bleed — phase color at edges ────────────────────────────────────────
function NeonBleed({ accentRgb, multiplier }: { accentRgb: string; multiplier: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="bT" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={`rgb(${accentRgb})`} stopOpacity={String(0.06 * multiplier)} />
            <Stop offset="0.28" stopColor={`rgb(${accentRgb})`} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="bB" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.72" stopColor={`rgb(${accentRgb})`} stopOpacity="0" />
            <Stop offset="1" stopColor={`rgb(${accentRgb})`} stopOpacity={String(0.05 * multiplier)} />
          </LinearGradient>
          <LinearGradient id="bL" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={`rgb(${accentRgb})`} stopOpacity={String(0.05 * multiplier)} />
            <Stop offset="0.22" stopColor={`rgb(${accentRgb})`} stopOpacity="0" />
          </LinearGradient>
          <LinearGradient id="bR" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0.78" stopColor={`rgb(${accentRgb})`} stopOpacity="0" />
            <Stop offset="1" stopColor={`rgb(${accentRgb})`} stopOpacity={String(0.05 * multiplier)} />
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

  const accentRgb = phase === 'night'      ? '138,95,224'
                  : phase === 'goldenHour' ? '255,107,53'
                  : '0,212,170';

  // Amber is intense — pull back during golden hour
  const phaseMultiplier = phase === 'goldenHour' ? 0.55 : 1.0;
  const ouroborosPhase  = getOuroborosPhase(phase);

  const orbScale        = useRef(new Animated.Value(1)).current;
  const bgGlow          = useRef(new Animated.Value(0)).current;
  const presenceOpacity = useRef(new Animated.Value(0)).current;
  const phraseOpacity   = useRef(new Animated.Value(0)).current;
  const returnOpacity   = useRef(new Animated.Value(0)).current;
  const wordOpacity     = useRef(new Animated.Value(1)).current;

  // ..: :.. — chaos → containment glyph
  // 7 chars: ['.','.',':',' ',':','.','.']
  // Left `..` = chaos (fast, irregular). Right `..` = containment (slow, steady).
  // After 8s all converge to unified breathing — the threshold has been held.
  const GLYPH_CHARS = ['.', '.', ':', ' ', ':', '.', '.'];
  const glyphAnims = useRef(GLYPH_CHARS.map(() => new Animated.Value(0.15))).current;

  const [tapPhrase, setTapPhrase]   = useState<string | null>(null);
  const [tapVisible, setTapVisible] = useState(false);
  const [wordIdx, setWordIdx]       = useState(0);
  const lastPhraseIdx = useRef(-1);
  const phraseTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const words = PHASE_WORDS[ouroborosPhase];

  useEffect(() => {
    // Orb + background breathing
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(orbScale, { toValue: 1.06, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bgGlow,   { toValue: 1,    duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(orbScale, { toValue: 1.00, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(bgGlow,   { toValue: 0,    duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]),
      ])
    ).start();

    // Presence line — fades in after 1.2s, already there
    const presenceTimer = setTimeout(() => {
      Animated.timing(presenceOpacity, {
        toValue: 1, duration: 2200,
        useNativeDriver: true, easing: Easing.inOut(Easing.sin),
      }).start();
    }, 1200);

    // Return — after 10s
    const returnTimer = setTimeout(() => {
      Animated.timing(returnOpacity, {
        toValue: 1, duration: 1800,
        useNativeDriver: true, easing: Easing.inOut(Easing.sin),
      }).start();
    }, 10000);

    // Meditation word cycle — slow, every 4s
    const cycleWord = () => {
      Animated.timing(wordOpacity, {
        toValue: 0, duration: 700,
        useNativeDriver: true, easing: Easing.inOut(Easing.sin),
      }).start(() => {
        setWordIdx(prev => (prev + 1) % words.length);
        Animated.timing(wordOpacity, {
          toValue: 1, duration: 700,
          useNativeDriver: true, easing: Easing.inOut(Easing.sin),
        }).start();
      });
    };
    const wordInterval = setInterval(cycleWord, 4000);

    return () => {
      clearTimeout(presenceTimer);
      clearTimeout(returnTimer);
      clearInterval(wordInterval);
      orbScale.stopAnimation();
      bgGlow.stopAnimation();
    };
  }, []);

  // Chaos → containment: left side is chaotic, right side already calm.
  // After 8s everything converges to unified breathing.
  useEffect(() => {
    // Chaos periods (ms) per char. Index 3 = space, always dim.
    //   0:'.'  1:'.'  2:':'  3:' '  4:':'  5:'.'  6:'.'
    const chaosPeriods  = [210,   280,   380,   0,     360,   540,   480  ];
    const chaosOffsets  = [0,     100,   50,    0,     70,    0,     180  ];
    const chaosLoops: Animated.CompositeAnimation[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];

    GLYPH_CHARS.forEach((_, i) => {
      if (i === 3) { glyphAnims[i].setValue(0.07); return; } // space stays void
      const period = chaosPeriods[i];
      const t = setTimeout(() => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(glyphAnims[i], {
              toValue: 1.0, duration: period / 2,
              easing: Easing.inOut(Easing.sin), useNativeDriver: false,
            }),
            Animated.timing(glyphAnims[i], {
              toValue: 0.12, duration: period / 2,
              easing: Easing.inOut(Easing.sin), useNativeDriver: false,
            }),
          ])
        );
        chaosLoops.push(loop);
        loop.start();
      }, chaosOffsets[i]);
      timers.push(t);
    });

    // After 8s: convergence — all breathe together. The threshold has been held.
    const conv = setTimeout(() => {
      chaosLoops.forEach(l => { try { (l as any).stop?.(); } catch {} });
      glyphAnims.forEach((a, i) => { if (i !== 3) a.stopAnimation(); });

      const PERIOD = 3200;
      GLYPH_CHARS.forEach((_, i) => {
        if (i === 3) return;
        const t2 = setTimeout(() => {
          Animated.loop(
            Animated.sequence([
              Animated.timing(glyphAnims[i], {
                toValue: 1.0, duration: PERIOD / 2,
                easing: Easing.inOut(Easing.sin), useNativeDriver: false,
              }),
              Animated.timing(glyphAnims[i], {
                toValue: 0.28, duration: PERIOD / 2,
                easing: Easing.inOut(Easing.sin), useNativeDriver: false,
              }),
            ])
          ).start();
        }, i * 120); // slight stagger remains — feels alive, not mechanical
        timers.push(t2);
      });
    }, 8000);
    timers.push(conv);

    return () => {
      timers.forEach(clearTimeout);
      glyphAnims.forEach(a => a.stopAnimation());
    };
  }, []);

  const handleTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const { text, index } = getPhrase(phase, lastPhraseIdx.current);
    lastPhraseIdx.current = index;
    setTapPhrase(text);
    // Cancel any in-flight fade out before cycling to next phrase
    if (phraseTimer.current) clearTimeout(phraseTimer.current);
    phraseOpacity.stopAnimation();
    phraseOpacity.setValue(0);
    Animated.timing(phraseOpacity, {
      toValue: 1, duration: 380,
      useNativeDriver: true, easing: Easing.out(Easing.quad),
    }).start();
    setTapVisible(true);

    phraseTimer.current = setTimeout(() => {
      Animated.timing(phraseOpacity, {
        toValue: 0, duration: 1800,
        useNativeDriver: true, easing: Easing.inOut(Easing.sin),
      }).start(() => { setTapVisible(false); setTapPhrase(null); });
    }, 5500);
  }, [phase]);

  const handleReturn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#050508" />

      {/* Ambient glow breath */}
      <Animated.View pointerEvents="none"
        style={[StyleSheet.absoluteFill, {
          backgroundColor: `rgba(${accentRgb}, ${0.04 * phaseMultiplier})`,
          opacity: bgGlow,
        }]}
      />

      {/* Neon bleed — edges breathe with phase color */}
      <NeonBleed accentRgb={accentRgb} multiplier={phaseMultiplier} />

      {/* Scanlines */}
      <ScanlineLayer />

      {/* Rain — circadian intensity */}
      {phase === 'night'      && <RainLayer accentRgb={accentRgb} count={18} maxOpacity={0.06} />}
      {phase === 'goldenHour' && <RainLayer accentRgb={accentRgb} count={10} maxOpacity={0.03} />}
      {phase === 'dawn'       && <RainLayer accentRgb={accentRgb} count={5}  maxOpacity={0.02} />}

      {/* Meditation word — cycles slowly, something to hold */}
      <Animated.Text style={[styles.meditationWord, {
        color: `rgba(${accentRgb}, 0.30)`,
        opacity: wordOpacity,
      }]}>
        {words[wordIdx]}
      </Animated.Text>

      {/* Central composition */}
      <View style={styles.center}>

        {/* OuroborosRing — tilted, halo in space */}
        <View style={[styles.absolute, {
          width: RING_SIZE, height: RING_SIZE,
          transform: [{ perspective: 600 }, { rotateX: '-12deg' }],
        }]} pointerEvents="none">
          <OuroborosRing
            size={RING_SIZE}
            color={theme.accent}
            cycleCount={sobriety.daysSober}
            phase={phase as any}
            breathing={false}
          />
        </View>

        {/* Single subtle inner glow — barely there, breathes with orb */}
        <Animated.View pointerEvents="none" style={[styles.absolute, {
          width: ORB * 1.5, height: ORB * 1.5, borderRadius: ORB * 0.75,
          backgroundColor: `rgba(${accentRgb}, ${0.022 * phaseMultiplier})`,
          transform: [{ scale: orbScale }],
        }]} />

        {/* Dark hollow — the vessel, same always regardless of phase */}
        <Animated.View pointerEvents="none" style={[styles.absolute, {
          width: ORB * 0.78, height: ORB * 0.78, borderRadius: ORB * 0.39,
          backgroundColor: 'rgba(2,3,5,0.90)',
          transform: [{ scale: orbScale }],
        }]} />

        {/* ..: :.. — chaos → containment, tap for a phrase */}
        <TouchableOpacity onPress={handleTap} activeOpacity={1} hitSlop={44}>
          <Animated.View style={{ transform: [{ scale: orbScale }], alignItems: 'center' }}>
            <View style={styles.glyphRow}>
              {GLYPH_CHARS.map((ch, i) => (
                <Animated.Text
                  key={i}
                  style={[
                    styles.glyphChar,
                    {
                      color: `rgba(${accentRgb}, 1)`,
                      opacity: i === 3
                        ? 0.07                // space — void between the sides
                        : glyphAnims[i],
                    },
                  ]}
                >
                  {ch}
                </Animated.Text>
              ))}
            </View>
          </Animated.View>
        </TouchableOpacity>

      </View>

      {/* Presence line — already there when they arrive */}
      <Animated.Text style={[styles.presenceLine, {
        color: `rgba(${accentRgb}, ${0.7 * phaseMultiplier})`,
        opacity: presenceOpacity,
      }]}>
        {PRESENCE}
      </Animated.Text>

      {/* Tap phrase — TypewriterText, fades out after 5s */}
      <Animated.View style={[styles.phraseWrap, { opacity: phraseOpacity }]}>
        {tapPhrase && (
          <TypewriterText
            text={tapPhrase}
            speed={18}
            jitter={8}
            style={[styles.phraseText, { color: `rgba(${accentRgb}, ${0.75 * phaseMultiplier})` }]}
          />
        )}
      </Animated.View>

      {/* Return */}
      <Animated.View style={[styles.returnWrap, { opacity: returnOpacity }]}>
        <TouchableOpacity onPress={handleReturn} hitSlop={16}>
          <Text style={[styles.returnText, { color: `rgba(${accentRgb}, ${0.25 * phaseMultiplier})` }]}>
            return when ready
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Wordmark */}
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
  meditationWord: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 64 : 48,
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 5,
    textTransform: 'lowercase',
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
  glyphRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  glyphChar: {
    fontFamily: 'SpaceMono',
    fontSize: 26,
    letterSpacing: 3,
  },
});
