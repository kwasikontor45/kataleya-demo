import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { MidnightGarden } from '@/constants/theme';
import { getCurrentPhase } from '@/constants/circadian';
import { Surface, Sanctuary, Fortress } from '@/utils/storage';

const WIN   = Dimensions.get('window');
const THEME = MidnightGarden;

// ── Privacy rings — each represents a vault layer ─────────────────────────
// Pulse inward toward the heart: Surface → Sanctuary → Fortress → heart beats
// Colors match the vault color assignments
const RING_COLORS = [
  { rgb: '212,163,115', label: 'surface'   }, // terra/violet — outermost
  { rgb: '135,168,120', label: 'sanctuary' }, // sage/cyan    — middle
  { rgb: '129,178,154', label: 'fortress'  }, // safe/amber   — innermost
];

// ── Heart assembly stages ──────────────────────────────────────────────────
const HEART_STAGES = [
  '',
  '.',
  '. .',
  '.. .',
  '..: .',
  '..: :.',
  '..: :..',   // complete — pulse here (index 6)
  '..: :..',   // hold
  '..: :..',   // hold
  '. : :.',
  ': :',
  ':',
  '',
];
const STAGE_MS = 320;

// ── Status messages — privacy-first, empowering ───────────────────────────
const STATUS = [
  'your data never leaves this device',
  'no account. no cloud. no trace.',
  'end-to-end encrypted',
  'you are not your past',
  'every day is a choice',
  'sanctuary ready',
];

export default function BridgeScreen() {
  const router = useRouter();
  const [onboarded, setOnboarded]       = useState<boolean | null>(null);
  const [enterReady, setEnterReady]     = useState(false);
  const [statusIdx, setStatusIdx]       = useState(0);
  const [heartStage, setHeartStage]     = useState(0);
  const [showContinue, setShowContinue] = useState(false);

  // Core anims
  const fadeIn        = useRef(new Animated.Value(0)).current;
  const heartScale    = useRef(new Animated.Value(1.0)).current;
  const heartOpacity  = useRef(new Animated.Value(0)).current;
  const statusOpacity = useRef(new Animated.Value(1)).current;
  const scanAnim      = useRef(new Animated.Value(0)).current;
  const enterFade     = useRef(new Animated.Value(0)).current;
  const wordmarkFade  = useRef(new Animated.Value(0)).current;

  // Three privacy rings — each gets its own scale + opacity
  const ring1Scale   = useRef(new Animated.Value(0.6)).current;
  const ring2Scale   = useRef(new Animated.Value(0.6)).current;
  const ring3Scale   = useRef(new Animated.Value(0.6)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const ring3Opacity = useRef(new Animated.Value(0)).current;

  // ── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const phase = getCurrentPhase(new Date().getHours() * 60 + new Date().getMinutes());
    if (Platform.OS !== 'web') {
      Sanctuary.logCircadianEvent({ ts: Date.now(), phase, event: 'app_open' }).catch(() => {});
    }
    const init = async () => {
      try {
        const tombstone = await Surface.getBurnTombstone();
        if (tombstone) {
          await Promise.all([
            Sanctuary.wipeSQLiteData().catch(() => {}),
            Fortress.clear().catch(() => {}),
          ]);
          await Surface.clearAll().catch(() => {});
        }
      } catch {}
      try {
        const done = await Surface.hasOnboarded();
        setOnboarded(done);
        setEnterReady(true);
      } catch {
        setOnboarded(false);
        setEnterReady(true);
      }
    };
    init();
  }, []);

  // ── Fade in whole screen ──────────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 1000, useNativeDriver: true }).start();
  }, []);

  // ── Privacy ring pulse sequence — Surface → Sanctuary → Fortress → heart ─
  // Rings ripple inward in sequence, then the heart beats, then repeat
  useEffect(() => {
    const ringPulse = (
      scale: Animated.Value,
      opacity: Animated.Value,
      size: number,
    ) => Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0.55, duration: 500, useNativeDriver: true }),
        Animated.timing(scale,   { toValue: 1.0,  duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0,   duration: 700, useNativeDriver: true }),
        Animated.timing(scale,   { toValue: 1.4, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
      // Reset for next loop
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0,   duration: 0, useNativeDriver: true }),
        Animated.timing(scale,   { toValue: 0.6, duration: 0, useNativeDriver: true }),
      ]),
    ]);

    const RING_GAP = 700; // ms between each ring firing

    const runLoop = () => {
      Animated.sequence([
        // Ring 1 — Surface (outer)
        ringPulse(ring1Scale, ring1Opacity, 1),
        Animated.delay(RING_GAP - 1500),
        // Ring 2 — Sanctuary (middle)
        ringPulse(ring2Scale, ring2Opacity, 2),
        Animated.delay(RING_GAP - 1500),
        // Ring 3 — Fortress (inner)
        ringPulse(ring3Scale, ring3Opacity, 3),
        // Pause before repeat
        Animated.delay(2800),
      ]).start(({ finished }) => { if (finished) runLoop(); });
    };

    const t = setTimeout(runLoop, 800);
    return () => clearTimeout(t);
  }, []);

  // ── Heart assembly → pulse → dissolve → loop ─────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let idx = 0;

    const advance = () => {
      idx = (idx + 1) % HEART_STAGES.length;
      setHeartStage(idx);

      // Pulse on complete stage
      if (idx === 6) {
        Animated.sequence([
          Animated.timing(heartScale, { toValue: 1.22, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(heartScale, { toValue: 0.94, duration: 140, useNativeDriver: true }),
          Animated.timing(heartScale, { toValue: 1.08, duration: 160, useNativeDriver: true }),
          Animated.timing(heartScale, { toValue: 1.0,  duration: 350, useNativeDriver: true }),
        ]).start();
      }

      const targetOpacity = idx === 0 ? 0
        : idx <= 6  ? 0.35 + (idx / 6) * 0.6
        : idx <= 12 ? Math.max(0, (12 - idx) / 6)
        : 0;

      Animated.timing(heartOpacity, {
        toValue: targetOpacity,
        duration: idx === 6 ? 60 : STAGE_MS * 0.65,
        useNativeDriver: true,
      }).start();

      const delay = (idx >= 6 && idx <= 8) ? STAGE_MS * 2.5 : STAGE_MS;
      timer = setTimeout(advance, delay);
    };

    timer = setTimeout(advance, 1200);
    return () => clearTimeout(timer);
  }, []);

  // ── Status cycling ────────────────────────────────────────────────────────
  useEffect(() => {
    const cycle = () => {
      Animated.timing(statusOpacity, { toValue: 0, duration: 380, useNativeDriver: true }).start(() => {
        setStatusIdx(i => (i + 1) % STATUS.length);
        Animated.timing(statusOpacity, { toValue: 1, duration: 480, useNativeDriver: true }).start();
      });
    };
    const t  = setInterval(cycle, 2600);
    const tc = setTimeout(() => {
      setShowContinue(true);
      Animated.timing(enterFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, 2600 * 2.5);
    return () => { clearInterval(t); clearTimeout(tc); };
  }, []);

  // ── Wordmark fades in late and stays barely visible ───────────────────────
  useEffect(() => {
    setTimeout(() => {
      Animated.timing(wordmarkFade, { toValue: 0.08, duration: 2000, useNativeDriver: true }).start();
    }, 3000);
  }, []);

  // ── Scan line ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const run = () => {
      scanAnim.setValue(-2);
      Animated.timing(scanAnim, {
        toValue: WIN.height + 2,
        duration: 4500,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => { if (finished) run(); });
    };
    run();
    return () => scanAnim.stopAnimation();
  }, []);

  const navigate = useCallback(() => {
    router.replace(onboarded === false ? '/onboarding' : '/(tabs)');
  }, [onboarded, router]);

  // Ring sizes — three concentric circles around the heart
  const R1 = 110; // Surface — outermost
  const R2 = 78;  // Sanctuary — middle
  const R3 = 50;  // Fortress — innermost

  return (
    <Animated.View style={[styles.container, { opacity: fadeIn }]}>

      {/* Scan line */}
      <Animated.View
        pointerEvents="none"
        style={[styles.scanLine, Platform.OS !== 'web'
          ? { transform: [{ translateY: scanAnim }] }
          : { top: scanAnim as any }]}
      />

      {/* Subtle grid */}
      <View style={styles.grid} pointerEvents="none">
        {Array.from({ length: 16 }).map((_, i) => <View key={i} style={styles.gridRow}/>)}
      </View>

      <View style={styles.inner}>

        {/* ── PRIVACY RINGS + HEART — the whole visual ── */}
        <View style={styles.orbArea}>

          {/* Ring 1 — Surface (outermost, terra) */}
          <Animated.View style={[
            styles.ring,
            {
              width: R1 * 2, height: R1 * 2, borderRadius: R1,
              borderColor: `rgba(${RING_COLORS[0].rgb}, 0.6)`,
              opacity: ring1Opacity,
              transform: [{ scale: ring1Scale }],
            },
          ]}/>

          {/* Ring 2 — Sanctuary (middle, sage) */}
          <Animated.View style={[
            styles.ring,
            {
              width: R2 * 2, height: R2 * 2, borderRadius: R2,
              borderColor: `rgba(${RING_COLORS[1].rgb}, 0.65)`,
              opacity: ring2Opacity,
              transform: [{ scale: ring2Scale }],
            },
          ]}/>

          {/* Ring 3 — Fortress (innermost, safe) */}
          <Animated.View style={[
            styles.ring,
            {
              width: R3 * 2, height: R3 * 2, borderRadius: R3,
              borderColor: `rgba(${RING_COLORS[2].rgb}, 0.7)`,
              opacity: ring3Opacity,
              transform: [{ scale: ring3Scale }],
            },
          ]}/>

          {/* The heart — assembles, pulses, dissolves */}
          <Animated.Text style={[
            styles.heart,
            {
              opacity: heartOpacity,
              transform: [{ scale: heartScale }],
            },
          ]}>
            {HEART_STAGES[heartStage]}
          </Animated.Text>
        </View>

        {/* Status — privacy-first cycling messages */}
        <Animated.Text style={[styles.status, { opacity: statusOpacity }]}>
          {STATUS[statusIdx]}
        </Animated.Text>

        {/* Enter button */}
        {showContinue && (
          <Animated.View style={{ opacity: enterFade }}>
            <TouchableOpacity style={styles.enterBtn} onPress={navigate} activeOpacity={0.7}>
              <Text style={styles.enterText}>enter →</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Kataleya wordmark — barely there, fades in late */}
        <Animated.Text style={[styles.wordmark, { opacity: wordmarkFade }]}>
          kataleya
        </Animated.Text>

      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  scanLine: {
    position: 'absolute', left: 0, right: 0, top: 0,
    height: 1, backgroundColor: `${THEME.accent}14`, zIndex: 5,
  },
  grid: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'space-evenly', opacity: 0.02,
  },
  gridRow: { height: StyleSheet.hairlineWidth, backgroundColor: THEME.accent },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 36,
  },
  orbArea: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
  },
  heart: {
    fontFamily: 'CourierPrime',
    fontSize: 34,
    color: THEME.accent,
    letterSpacing: 6,
    textAlign: 'center',
  },
  status: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    color: `${THEME.accent}80`,
    letterSpacing: 2,
    textAlign: 'center',
    textTransform: 'lowercase',
    maxWidth: 260,
    lineHeight: 18,
  },
  enterBtn: {
    borderWidth: 1,
    borderColor: `${THEME.accent}45`,
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 48,
  },
  enterText: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    color: THEME.accent,
    letterSpacing: 2,
  },
  wordmark: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    color: THEME.text,
    letterSpacing: 8,
    textTransform: 'lowercase',
    position: 'absolute',
    bottom: 48,
  },
});
