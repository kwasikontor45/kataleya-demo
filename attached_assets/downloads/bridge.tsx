import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MidnightGarden } from '@/constants/theme';
import { getCurrentPhase } from '@/constants/circadian';
import { Surface, Sanctuary, Fortress } from '@/utils/storage';

const WIN = Dimensions.get('window');
const NOISE_CHARS = '·∴∵∶∷⁝⁞░▒▓▄▀■□●○◆~-_=+|/\\:;,.?!@#';

function rnd(chars: string) {
  return chars[Math.floor(Math.random() * chars.length)];
}
function mkNoise(n: number) {
  return Array.from({ length: n }, () => rnd(NOISE_CHARS)).join('');
}
function mkBinary(n: number) {
  return Array.from({ length: n }, () => (Math.random() > 0.5 ? '1' : '0')).join(' ');
}

const THEME = MidnightGarden;

const STATUS_CYCLE = [
  'securing signal',
  'sampling reality',
  'no soil required',
  'encoding memory',
  'bridging threshold',
  'sanctuary ready',
];
const STATUS_INTERVAL_MS = 2200;

export default function BridgeScreen() {
  const router = useRouter();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [statusIdx, setStatusIdx] = useState(0);
  const [noiseLines, setNoiseLines] = useState(() => [mkNoise(22), mkNoise(17), mkNoise(20)]);
  const [binaryLines, setBinaryLines] = useState(() => [mkBinary(10), mkBinary(8), mkBinary(12)]);
  const [showContinue, setShowContinue] = useState(false);

  const scanAnim = useRef(new Animated.Value(0)).current;
  const heartAnim = useRef(new Animated.Value(0.45)).current;
  const heartScale = useRef(new Animated.Value(0.97)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const statusOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const now = new Date();
    const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
    const phase = getCurrentPhase(minutesSinceMidnight);
    if (Platform.OS !== 'web') {
      Sanctuary.logCircadianEvent({ ts: Date.now(), phase, event: 'app_open' }).catch(() => {});
    }

    // ── Tombstone recovery ────────────────────────────────────────────────────
    // If the OS killed the process during a burn between Phase 2 (native wipes)
    // and Phase 3 (Surface.clearAll), the tombstone key survived in AsyncStorage.
    // Detect it here and complete the wipe before routing anywhere — the bridge
    // animation gives us the time to do this invisibly.
    // wipeSQLiteData() and Fortress.clear() are idempotent on already-empty vaults.
    const init = async () => {
      const tombstone = await Surface.getBurnTombstone();
      if (tombstone) {
        await Promise.all([
          Sanctuary.wipeSQLiteData(),
          Fortress.clear(),
        ]);
        await Surface.clearAll(); // also erases the tombstone — leaves no trace
      }
      const done = await Surface.hasOnboarded();
      setOnboarded(done);
    };

    init().catch(() => {
      // Recovery itself failed (extremely unlikely) — still route rather than hang.
      Surface.hasOnboarded().then(done => setOnboarded(done));
    });
  }, []);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, []);

  // Continuous status cycling with fade transition
  useEffect(() => {
    const cycle = () => {
      Animated.timing(statusOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setStatusIdx(i => (i + 1) % STATUS_CYCLE.length);
        Animated.timing(statusOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      });
    };
    const t = setInterval(cycle, STATUS_INTERVAL_MS);
    // Show continue after first full cycle
    const tc = setTimeout(() => setShowContinue(true), 900);
    return () => { clearInterval(t); clearTimeout(tc); };
  }, []);

  // Noise field refresh
  useEffect(() => {
    const ni = setInterval(() => {
      setNoiseLines([
        mkNoise(Math.floor(16 + Math.random() * 10)),
        mkNoise(Math.floor(12 + Math.random() * 12)),
        mkNoise(Math.floor(18 + Math.random() * 8)),
      ]);
    }, 80 + Math.random() * 60);
    const bi = setInterval(() => {
      setBinaryLines([
        mkBinary(Math.floor(8 + Math.random() * 5)),
        mkBinary(Math.floor(6 + Math.random() * 6)),
        mkBinary(Math.floor(10 + Math.random() * 4)),
      ]);
    }, 220);
    return () => { clearInterval(ni); clearInterval(bi); };
  }, []);

  // Scan line — constant downward drift, loops
  useEffect(() => {
    const runScan = () => {
      scanAnim.setValue(-2);
      Animated.timing(scanAnim, {
        toValue: WIN.height + 2,
        duration: 3800,
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => { if (finished) runScan(); });
    };
    runScan();
    return () => scanAnim.stopAnimation();
  }, []);

  // Cardiac beat
  useEffect(() => {
    const beat = () => {
      Animated.sequence([
        Animated.timing(heartAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.delay(120),
        Animated.timing(heartAnim, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) beat(); });
      Animated.sequence([
        Animated.timing(heartScale, { toValue: 1.06, duration: 180, useNativeDriver: true }),
        Animated.delay(120),
        Animated.timing(heartScale, { toValue: 0.97, duration: 700, useNativeDriver: true }),
      ]).start();
    };
    beat();
  }, []);

  const navigate = () => {
    if (onboarded === null) return;
    router.replace(onboarded ? '/(tabs)' : '/onboarding');
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeIn }]}>

      {/* Scan line — always drifting */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.scanLine,
          Platform.OS !== 'web'
            ? { transform: [{ translateY: scanAnim }] }
            : { top: scanAnim as any },
        ]}
      />

      {/* Subtle grid */}
      <View style={styles.gridOverlay} pointerEvents="none">
        {Array.from({ length: 14 }).map((_, i) => (
          <View key={i} style={styles.gridRow} />
        ))}
      </View>

      <View style={styles.inner}>

        {/* Top noise field — no label */}
        <View style={styles.noiseSection}>
          {noiseLines.map((line, i) => (
            <Text key={i} style={[styles.noiseText, { opacity: 0.18 + i * 0.07 }]}>{line}</Text>
          ))}
        </View>

        {/* Cardiac membrane */}
        <View style={styles.membraneSection}>
          <View style={styles.membraneLine} />
          <Animated.Text
            style={[
              styles.heartSymbol,
              { opacity: heartAnim, transform: [{ scale: heartScale }] },
            ]}
          >
            ..: :..
          </Animated.Text>
          <View style={styles.membraneLine} />
        </View>

        {/* Cycling status — no progress bar */}
        <Animated.Text style={[styles.statusText, { opacity: statusOpacity }]}>
          {STATUS_CYCLE[statusIdx]}
        </Animated.Text>

        {/* Bottom binary field — no label */}
        <View style={styles.binarySection}>
          {binaryLines.map((line, i) => (
            <Text key={i} style={[styles.binaryText, { opacity: 0.12 + i * 0.09 }]}>{line}</Text>
          ))}
        </View>

        {/* Continue */}
        {showContinue && (
          <TouchableOpacity style={styles.continueBtn} onPress={navigate} activeOpacity={0.7}>
            <Text style={styles.continueBtnText}>continue →</Text>
          </TouchableOpacity>
        )}

        {/* Kataleya — barely there */}
        <Text style={styles.wordmark}>kataleya</Text>

      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.bg,
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 1,
    backgroundColor: `${THEME.accent}20`,
    zIndex: 5,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'space-evenly',
    opacity: 0.03,
  },
  gridRow: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: THEME.accent,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 22,
  },
  noiseSection: {
    width: '100%',
    alignItems: 'flex-start',
    gap: 4,
  },
  noiseText: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    color: THEME.gold,
    letterSpacing: 1.5,
  },
  membraneSection: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  membraneLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: `${THEME.border}60`,
  },
  heartSymbol: {
    fontFamily: 'CourierPrime',
    fontSize: 30,
    color: THEME.accent,
    textAlign: 'center',
    letterSpacing: 4,
  },
  statusText: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    color: `${THEME.accent}80`,
    letterSpacing: 3,
  },
  binarySection: {
    width: '100%',
    alignItems: 'flex-end',
    gap: 4,
  },
  binaryText: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    color: THEME.accentSoft,
    letterSpacing: 2,
  },
  continueBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: `${THEME.accent}50`,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 36,
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
    marginTop: 4,
  },
});
