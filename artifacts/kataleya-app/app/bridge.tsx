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
import { useRouter } from 'expo-router';
import { MidnightGarden } from '@/constants/theme';
import { getCurrentPhase } from '@/constants/circadian';
import { Surface, Sanctuary, Fortress } from '@/utils/storage';

const WIN  = Dimensions.get('window');
const THEME = MidnightGarden;

// ── Heart symbol stages ────────────────────────────────────────────────────
// The ..: :.. assembles itself piece by piece, pulses, then dissolves.
// Each stage is what's visible during that beat.
const HEART_STAGES = [
  '',           // blank — start
  '.',          // first dot appears
  '. .',        // two dots
  '.. .',       // three
  '..: .',      // left side forms
  '..: :.',     // right side forms
  '..: :..',    // complete — pulse here
  '..: :..',    // hold pulse
  '..: :..',    // hold pulse
  '. : :.',     // dissolve outward
  ': :',        // fading
  ':',          // last ember
  '',           // gone — loop
];
const STAGE_DURATION = 340; // ms per stage

// Status messages — empowering, for sensitive people
const STATUS_CYCLE = [
  'you are not your past',
  'no data leaves this device',
  'no judgement here',
  'every day is a choice',
  'you are safe here',
  'sanctuary ready',
];

// Noise chars for the ambient data field
const NOISE_CHARS = '·∴∵∶∷⁝░▒~-_=+|/\\:;.?@#§';
function mkNoise(n: number) {
  return Array.from({ length: n }, () => NOISE_CHARS[Math.floor(Math.random() * NOISE_CHARS.length)]).join('');
}
function mkBinary(n: number) {
  return Array.from({ length: n }, () => (Math.random() > 0.5 ? '1' : '0')).join(' ');
}

export default function BridgeScreen() {
  const router   = useRouter();
  const [onboarded, setOnboarded]       = useState<boolean | null>(null);
  const [statusIdx, setStatusIdx]       = useState(0);
  const [heartStage, setHeartStage]     = useState(0);
  const [noiseLines, setNoiseLines]     = useState(() => [mkNoise(22), mkNoise(17), mkNoise(20)]);
  const [binaryLines, setBinaryLines]   = useState(() => [mkBinary(10), mkBinary(8), mkBinary(12)]);
  const [showContinue, setShowContinue] = useState(false);
  const [enterReady, setEnterReady]     = useState(false); // true once we know onboarded state

  const fadeIn        = useRef(new Animated.Value(0)).current;
  const heartScale    = useRef(new Animated.Value(1)).current;
  const heartOpacity  = useRef(new Animated.Value(0)).current;
  const statusOpacity = useRef(new Animated.Value(1)).current;
  const scanAnim      = useRef(new Animated.Value(0)).current;

  // ── Init — robust against SQLite failures in Expo Go ─────────────────────
  useEffect(() => {
    const phase = getCurrentPhase(new Date().getHours() * 60 + new Date().getMinutes());

    // Log app open — silently fails in Expo Go (no SQLite)
    if (Platform.OS !== 'web') {
      Sanctuary.logCircadianEvent({ ts: Date.now(), phase, event: 'app_open' }).catch(() => {});
    }

    const init = async () => {
      try {
        const tombstone = await Surface.getBurnTombstone();
        if (tombstone) {
          // Tombstone recovery — silently fail on Expo Go (SQLite not available)
          await Promise.all([
            Sanctuary.wipeSQLiteData().catch(() => {}),
            Fortress.clear().catch(() => {}),
          ]);
          await Surface.clearAll().catch(() => {});
        }
      } catch { /* tombstone path failed — not critical */ }

      // hasOnboarded uses AsyncStorage (Surface) — always works, even in Expo Go
      try {
        const done = await Surface.hasOnboarded();
        setOnboarded(done);
        setEnterReady(true);
      } catch {
        // Absolute last resort — route to onboarding
        setOnboarded(false);
        setEnterReady(true);
      }
    };

    init();
  }, []);

  // ── Fade in ───────────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 900, useNativeDriver: true }).start();
  }, []);

  // ── Heart assembles → pulse → dissolve → loop ────────────────────────────
  useEffect(() => {
    let stageTimer: ReturnType<typeof setTimeout>;
    let stageIndex = 0;

    const advance = () => {
      stageIndex = (stageIndex + 1) % HEART_STAGES.length;
      setHeartStage(stageIndex);

      // On the complete stage (index 6) — fire the pulse animation
      if (stageIndex === 6) {
        Animated.sequence([
          Animated.timing(heartScale, { toValue: 1.18, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(heartScale, { toValue: 0.96, duration: 180, useNativeDriver: true }),
          Animated.timing(heartScale, { toValue: 1.06, duration: 160, useNativeDriver: true }),
          Animated.timing(heartScale, { toValue: 1.0,  duration: 400, useNativeDriver: true }),
        ]).start();
      }

      // Fade in as it assembles, fade out as it dissolves
      const targetOpacity = stageIndex === 0 ? 0
        : stageIndex <= 6  ? 0.3 + (stageIndex / 6) * 0.65
        : stageIndex <= 12 ? Math.max(0, (12 - stageIndex) / 6)
        : 0;

      Animated.timing(heartOpacity, {
        toValue: targetOpacity,
        duration: stageIndex === 6 ? 80 : STAGE_DURATION * 0.7,
        useNativeDriver: true,
      }).start();

      // Longer pause on complete pulse stages
      const delay = (stageIndex >= 6 && stageIndex <= 8) ? STAGE_DURATION * 2.2 : STAGE_DURATION;
      stageTimer = setTimeout(advance, delay);
    };

    stageTimer = setTimeout(advance, 600);
    return () => clearTimeout(stageTimer);
  }, []);

  // ── Status cycling ────────────────────────────────────────────────────────
  useEffect(() => {
    const cycle = () => {
      Animated.timing(statusOpacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
        setStatusIdx(i => (i + 1) % STATUS_CYCLE.length);
        Animated.timing(statusOpacity, { toValue: 1, duration: 450, useNativeDriver: true }).start();
      });
    };
    const t  = setInterval(cycle, 2400);
    const tc = setTimeout(() => setShowContinue(true), 2400 * 2);
    return () => { clearInterval(t); clearTimeout(tc); };
  }, []);

  // ── Noise fields ──────────────────────────────────────────────────────────
  useEffect(() => {
    const ni = setInterval(() => {
      setNoiseLines([mkNoise(18 + Math.floor(Math.random() * 10)), mkNoise(14 + Math.floor(Math.random() * 10)), mkNoise(16 + Math.floor(Math.random() * 10))]);
    }, 90);
    const bi = setInterval(() => {
      setBinaryLines([mkBinary(8 + Math.floor(Math.random() * 5)), mkBinary(6 + Math.floor(Math.random() * 6)), mkBinary(9 + Math.floor(Math.random() * 5))]);
    }, 220);
    return () => { clearInterval(ni); clearInterval(bi); };
  }, []);

  // ── Scan line ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const run = () => {
      scanAnim.setValue(-2);
      Animated.timing(scanAnim, {
        toValue: WIN.height + 2, duration: 4000, useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => { if (finished) run(); });
    };
    run();
    return () => scanAnim.stopAnimation();
  }, []);

  const navigate = useCallback(() => {
    // If we know the state — go. If still loading, assume onboarded (shows home)
    // so the user isn't locked out by SQLite errors in Expo Go.
    const dest = onboarded === false ? '/onboarding' : '/(tabs)';
    router.replace(dest);
  }, [onboarded, router]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeIn }]}>

      {/* Scan line */}
      <Animated.View
        pointerEvents="none"
        style={[styles.scanLine, Platform.OS !== 'web'
          ? { transform: [{ translateY: scanAnim }] }
          : { top: scanAnim as any }]}
      />

      {/* Grid */}
      <View style={styles.gridOverlay} pointerEvents="none">
        {Array.from({ length: 14 }).map((_, i) => <View key={i} style={styles.gridRow}/>)}
      </View>

      <View style={styles.inner}>

        {/* Noise field — top */}
        <View style={styles.noiseSection}>
          {noiseLines.map((line, i) => (
            <Text key={i} style={[styles.noiseText, { opacity: 0.12 + i * 0.05 }]}>{line}</Text>
          ))}
        </View>

        {/* ── THE HEART — assembles, pulses, dissolves ── */}
        <View style={styles.heartSection}>
          <View style={styles.heartLine}>
            <View style={styles.membraneLine}/>
            <Animated.Text style={[styles.heartSymbol, {
              opacity: heartOpacity,
              transform: [{ scale: heartScale }],
            }]}>
              {HEART_STAGES[heartStage]}
            </Animated.Text>
            <View style={styles.membraneLine}/>
          </View>
        </View>

        {/* Status — empowering cycling messages */}
        <Animated.Text style={[styles.statusText, { opacity: statusOpacity }]}>
          {STATUS_CYCLE[statusIdx]}
        </Animated.Text>

        <Text style={styles.subText}>this is your sanctuary</Text>

        {/* Binary field — bottom */}
        <View style={styles.binarySection}>
          {binaryLines.map((line, i) => (
            <Text key={i} style={[styles.binaryText, { opacity: 0.09 + i * 0.07 }]}>{line}</Text>
          ))}
        </View>

        {/* Enter — always tappable after showContinue, never blocked */}
        {showContinue && (
          <TouchableOpacity style={styles.continueBtn} onPress={navigate} activeOpacity={0.7}>
            <Text style={styles.continueBtnText}>
              {enterReady ? 'enter →' : 'enter →'}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.wordmark}>kataleya</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg, overflow: 'hidden' },
  scanLine: {
    position: 'absolute', left: 0, right: 0, top: 0, height: 1,
    backgroundColor: `${THEME.accent}18`, zIndex: 5,
  },
  gridOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'space-evenly', opacity: 0.025,
  },
  gridRow: { height: StyleSheet.hairlineWidth, backgroundColor: THEME.accent },
  inner: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 28, gap: 20,
  },
  noiseSection: { width: '100%', alignItems: 'flex-start', gap: 3 },
  noiseText: { fontFamily: 'CourierPrime', fontSize: 11, color: THEME.gold, letterSpacing: 1.5 },
  heartSection: { width: '100%', alignItems: 'center' },
  heartLine: {
    width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  membraneLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: `${THEME.border}50` },
  heartSymbol: {
    fontFamily: 'CourierPrime',
    fontSize: 32,
    color: THEME.accent,
    letterSpacing: 5,
    minWidth: 110,
    textAlign: 'center',
  },
  statusText: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    color: `${THEME.accent}85`,
    letterSpacing: 2.5,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  subText: {
    fontFamily: 'CourierPrime',
    fontSize: 9,
    color: `${THEME.textMuted}45`,
    letterSpacing: 3,
    textTransform: 'lowercase',
    marginTop: -12,
  },
  binarySection: { width: '100%', alignItems: 'flex-end', gap: 3 },
  binaryText: { fontFamily: 'CourierPrime', fontSize: 11, color: THEME.accentSoft, letterSpacing: 2 },
  continueBtn: {
    borderWidth: 1,
    borderColor: `${THEME.accent}45`,
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 40,
  },
  continueBtnText: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    color: THEME.accent,
    letterSpacing: 2,
  },
  wordmark: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    color: `${THEME.text}10`,
    letterSpacing: 6,
    textTransform: 'lowercase',
  },
});
