#!/bin/bash
# kataleya-sanctuary-fixes.sh
# Run from: ~/kataleya
# Fixes: morning theme contrast, milestone undefined, dark mode on home, bridge screen empowerment
# Usage: bash ~/kataleya-sanctuary-fixes.sh

set -e
APP="artifacts/kataleya-app"
echo "→ Applying sanctuary fixes..."

# ─────────────────────────────────────────────────────────────────────────────
# FIX 1 — MorningBloom contrast
# Problem: #f0ebe2 bg with light text is too washed out in dawn/day
# Fix: richer warm cream with proper dark text contrast
# ─────────────────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
import pathlib
path = pathlib.Path("artifacts/kataleya-app/constants/theme.ts")
src = path.read_text()

# Update MorningBloom for better readability
replacements = [
    ("bg:               '#f0ebe2'",   "bg:               '#e8ddd0'"),
    ("bg:               '#faf8f5'",   "bg:               '#e8ddd0'"),
    ("surface:          '#f7f2ea'",   "surface:          '#f0e8dc'"),
    ("surface:          '#ffffff'",   "surface:          '#f0e8dc'"),
    ("surfaceHighlight: '#f5f0e8'",   "surfaceHighlight: '#e0d4c4'"),
    ("text:             '#2a1810'",   "text:             '#1a100a'"),
    ("textMuted:        '#6b5540'",   "textMuted:        '#4a3525'"),
    ("accent:           '#b85510'",   "accent:           '#a04510'"),
    ("border:           '#d0c0a8'",   "border:           '#c4a888'"),
]
for old, new in replacements:
    if old in src:
        src = src.replace(old, new)

path.write_text(src)
print("  ✓ Fix 1: MorningBloom contrast improved")
PYEOF

# ─────────────────────────────────────────────────────────────────────────────
# FIX 2 — Milestone toast label fix
# Problem: BLOOM_THRESHOLDS has no .label field, toast shows "undefined"
# Fix: use .stage and map to human-readable milestone names
# ─────────────────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
import pathlib, re
path = pathlib.Path("artifacts/kataleya-app/app/(tabs)/index.tsx")
src = path.read_text()

# Fix the toast call — replace threshold.label with a stage→label map
old_toast = """          threshold.fire();
          showToast(`🦋 \${threshold.label} milestone reached`);"""

new_toast = """          threshold.fire();
          const stageLabels: Record<string, string> = {
            budding: 'Day 1',
            parting: 'One Week',
            labellum: 'One Month',
            fullBloom: 'Three Months',
          };
          const milestoneLabel = stageLabels[threshold.stage] ?? threshold.stage;
          showToast(`🦋 ${milestoneLabel} — you made it`);"""

if old_toast in src:
    src = src.replace(old_toast, new_toast)
    print("  ✓ Fix 2: milestone toast label fixed")
else:
    # Also fix the simpler version without showToast
    old2 = """          threshold.fire();"""
    new2 = """          threshold.fire();"""
    print("  ~ Fix 2: toast pattern not found in this index.tsx version — milestone haptic still fires")

path.write_text(src)
PYEOF

# ─────────────────────────────────────────────────────────────────────────────
# FIX 3 — Force dark mode toggle on home screen
# Add a subtle moon/sun toggle to the header row next to CircadianBadge
# ─────────────────────────────────────────────────────────────────────────────
python3 - << 'PYEOF'
import pathlib
path = pathlib.Path("artifacts/kataleya-app/app/(tabs)/index.tsx")
src = path.read_text()

# Add darkOverride to the useCircadian destructure
old_circadian = "  const { theme, phase, phaseConfig } = useCircadian();"
new_circadian = "  const { theme, phase, phaseConfig, darkOverride, setDarkOverride } = useCircadian();"
if old_circadian in src:
    src = src.replace(old_circadian, new_circadian)

# Add the toggle in the header, between logo and CircadianBadge
old_header = """          <CircadianBadge theme={theme} phaseConfig={phaseConfig} />
        </View>"""

new_header = """          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => { setDarkOverride(!darkOverride); }}
              style={[styles.darkToggle, { borderColor: `rgba(${accentRgb},0.25)`, backgroundColor: `rgba(${accentRgb},0.07)` }]}
              hitSlop={10}
            >
              <Text style={[styles.darkToggleIcon, { color: `rgba(${accentRgb},0.7)` }]}>
                {darkOverride ? '☀' : '◗'}
              </Text>
            </TouchableOpacity>
            <CircadianBadge theme={theme} phaseConfig={phaseConfig} />
          </View>
        </View>"""

if old_header in src:
    src = src.replace(old_header, new_header)
    print("  ✓ Fix 3: dark mode toggle added to home header")
else:
    print("  ~ Fix 3: header pattern not found, skipping")

# Add styles for the toggle
old_logo_style = "  logoText: {"
new_logo_style = """  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  darkToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkToggleIcon: { fontSize: 14, lineHeight: 16 },
  logoText: {"""

if "headerRight:" not in src and old_logo_style in src:
    src = src.replace(old_logo_style, new_logo_style)

path.write_text(src)
PYEOF

# ─────────────────────────────────────────────────────────────────────────────
# FIX 4 — Bridge screen: butterfly DNA SVG + empowering messages
# Replace the ..: :.. heart with a proper butterfly SVG illustration
# Update STATUS_CYCLE with empowering sanctuary-appropriate messages
# ─────────────────────────────────────────────────────────────────────────────
cat > "$APP/app/bridge.tsx" << 'ENDOFFILE'
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
import Svg, { Path, Circle, Ellipse, Defs, RadialGradient, Stop, G } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { MidnightGarden } from '@/constants/theme';
import { getCurrentPhase } from '@/constants/circadian';
import { Surface, Sanctuary, Fortress } from '@/utils/storage';

const WIN = Dimensions.get('window');
const NOISE_CHARS = '·∴∵∶∷⁝⁞░▒▓~-_=+|/\\:;,.?!@#§';

function rnd(chars: string) { return chars[Math.floor(Math.random() * chars.length)]; }
function mkNoise(n: number) { return Array.from({ length: n }, () => rnd(NOISE_CHARS)).join(''); }
function mkBinary(n: number) { return Array.from({ length: n }, () => (Math.random() > 0.5 ? '1' : '0')).join(' '); }

const THEME = MidnightGarden;

// Empowering messages for sensitive people in recovery
const STATUS_CYCLE = [
  'you are not your past',
  'sanctuary initialising',
  'your data stays with you',
  'no judgement here',
  'every day is a choice',
  'sanctuary ready',
];
const STATUS_INTERVAL_MS = 2200;

// DNA Butterfly SVG — monarch wings + DNA helix on upper wings
// Matches the artwork: warm amber/terra wings, dark metallic DNA strands
function ButterflyDNA({ size = 180 }: { size?: number }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 2200, useNativeDriver: true }),
          Animated.timing(glowAnim,  { toValue: 0.75, duration: 2200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(pulseAnim, { toValue: 1.0,  duration: 2200, useNativeDriver: true }),
          Animated.timing(glowAnim,  { toValue: 0.4,  duration: 2200, useNativeDriver: true }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const s = size;

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }], opacity: glowAnim, width: s, height: s * 0.72 }}>
      <Svg width={s} height={s * 0.72} viewBox="0 0 200 144">
        <Defs>
          <RadialGradient id="wing-glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#d4a373" stopOpacity="0.3"/>
            <Stop offset="100%" stopColor="#d4a373" stopOpacity="0"/>
          </RadialGradient>
        </Defs>

        {/* Ambient glow behind wings */}
        <Ellipse cx={100} cy={72} rx={90} ry={60} fill="url(#wing-glow)"/>

        {/* ── LEFT UPPER WING ── */}
        <Path
          d="M100 72 Q60 20 20 35 Q5 55 18 75 Q35 90 65 82 Q85 78 100 72Z"
          fill="#c8813a"
          fillOpacity={0.88}
        />
        {/* Wing detail — inner veins */}
        <Path d="M100 72 Q75 50 40 45" fill="none" stroke="#1a0e05" strokeWidth={0.8} strokeOpacity={0.5}/>
        <Path d="M100 72 Q70 58 35 62" fill="none" stroke="#1a0e05" strokeWidth={0.6} strokeOpacity={0.4}/>
        {/* DNA helix on left upper wing */}
        <Path d="M38 48 Q45 52 52 48 Q59 44 66 48 Q73 52 80 48" fill="none" stroke="#2a2020" strokeWidth={1.2} strokeOpacity={0.7}/>
        <Path d="M38 54 Q45 50 52 54 Q59 58 66 54 Q73 50 80 54" fill="none" stroke="#2a2020" strokeWidth={1.2} strokeOpacity={0.7}/>
        <Circle cx={45} cy={51} r={1.2} fill="#1a1010" fillOpacity={0.6}/>
        <Circle cx={59} cy={46} r={1.2} fill="#1a1010" fillOpacity={0.6}/>
        <Circle cx={73} cy={51} r={1.2} fill="#1a1010" fillOpacity={0.6}/>
        {/* Spots */}
        <Circle cx={28} cy={58} r={2.5} fill="#f5f0e8" fillOpacity={0.7}/>
        <Circle cx={22} cy={70} r={2}   fill="#f5f0e8" fillOpacity={0.6}/>

        {/* ── RIGHT UPPER WING ── */}
        <Path
          d="M100 72 Q140 20 180 35 Q195 55 182 75 Q165 90 135 82 Q115 78 100 72Z"
          fill="#c8813a"
          fillOpacity={0.88}
        />
        <Path d="M100 72 Q125 50 160 45" fill="none" stroke="#1a0e05" strokeWidth={0.8} strokeOpacity={0.5}/>
        <Path d="M100 72 Q130 58 165 62" fill="none" stroke="#1a0e05" strokeWidth={0.6} strokeOpacity={0.4}/>
        {/* DNA helix on right upper wing */}
        <Path d="M120 48 Q127 52 134 48 Q141 44 148 48 Q155 52 162 48" fill="none" stroke="#2a2020" strokeWidth={1.2} strokeOpacity={0.7}/>
        <Path d="M120 54 Q127 50 134 54 Q141 58 148 54 Q155 50 162 54" fill="none" stroke="#2a2020" strokeWidth={1.2} strokeOpacity={0.7}/>
        <Circle cx={127} cy={51} r={1.2} fill="#1a1010" fillOpacity={0.6}/>
        <Circle cx={141} cy={46} r={1.2} fill="#1a1010" fillOpacity={0.6}/>
        <Circle cx={155} cy={51} r={1.2} fill="#1a1010" fillOpacity={0.6}/>
        <Circle cx={172} cy={58} r={2.5} fill="#f5f0e8" fillOpacity={0.7}/>
        <Circle cx={178} cy={70} r={2}   fill="#f5f0e8" fillOpacity={0.6}/>

        {/* ── LEFT LOWER WING ── */}
        <Path
          d="M100 72 Q55 85 30 110 Q25 128 45 132 Q70 135 88 110 Q96 92 100 72Z"
          fill="#b06a28"
          fillOpacity={0.82}
        />
        <Circle cx={42} cy={118} r={3} fill="#1a0e05" fillOpacity={0.5}/>
        <Circle cx={55} cy={126} r={2} fill="#1a0e05" fillOpacity={0.4}/>
        <Circle cx={34} cy={112} r={1.8} fill="#f5f0e8" fillOpacity={0.55}/>

        {/* ── RIGHT LOWER WING ── */}
        <Path
          d="M100 72 Q145 85 170 110 Q175 128 155 132 Q130 135 112 110 Q104 92 100 72Z"
          fill="#b06a28"
          fillOpacity={0.82}
        />
        <Circle cx={158} cy={118} r={3}   fill="#1a0e05" fillOpacity={0.5}/>
        <Circle cx={145} cy={126} r={2}   fill="#1a0e05" fillOpacity={0.4}/>
        <Circle cx={166} cy={112} r={1.8} fill="#f5f0e8" fillOpacity={0.55}/>

        {/* ── BODY ── */}
        <Path
          d="M97 30 Q100 28 103 30 L104 120 Q100 124 96 120 Z"
          fill="#1a0e05"
          fillOpacity={0.85}
        />
        {/* Antennae */}
        <Path d="M100 30 Q88 12 82 4"  fill="none" stroke="#2a1a08" strokeWidth={1} strokeOpacity={0.7} strokeLinecap="round"/>
        <Path d="M100 30 Q112 12 118 4" fill="none" stroke="#2a1a08" strokeWidth={1} strokeOpacity={0.7} strokeLinecap="round"/>
        <Circle cx={82}  cy={4}  r={2.5} fill="#2a1a08" fillOpacity={0.7}/>
        <Circle cx={118} cy={4}  r={2.5} fill="#2a1a08" fillOpacity={0.7}/>

        {/* Wing borders / outline */}
        <Path
          d="M100 72 Q60 20 20 35 Q5 55 18 75 Q35 90 65 82 Q85 78 100 72Z"
          fill="none" stroke="#1a0e05" strokeWidth={0.8} strokeOpacity={0.4}
        />
        <Path
          d="M100 72 Q140 20 180 35 Q195 55 182 75 Q165 90 135 82 Q115 78 100 72Z"
          fill="none" stroke="#1a0e05" strokeWidth={0.8} strokeOpacity={0.4}
        />
      </Svg>
    </Animated.View>
  );
}

export default function BridgeScreen() {
  const router = useRouter();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [statusIdx, setStatusIdx] = useState(0);
  const [noiseLines, setNoiseLines] = useState(() => [mkNoise(22), mkNoise(17), mkNoise(20)]);
  const [binaryLines, setBinaryLines] = useState(() => [mkBinary(10), mkBinary(8), mkBinary(12)]);
  const [showContinue, setShowContinue] = useState(false);

  const scanAnim    = useRef(new Animated.Value(0)).current;
  const fadeIn      = useRef(new Animated.Value(0)).current;
  const statusOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const now = new Date();
    const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
    const phase = getCurrentPhase(minutesSinceMidnight);
    if (Platform.OS !== 'web') {
      Sanctuary.logCircadianEvent({ ts: Date.now(), phase, event: 'app_open' }).catch(() => {});
    }

    const init = async () => {
      const tombstone = await Surface.getBurnTombstone();
      if (tombstone) {
        await Promise.all([Sanctuary.wipeSQLiteData(), Fortress.clear()]);
        await Surface.clearAll();
      }
      const done = await Surface.hasOnboarded();
      setOnboarded(done);
    };

    init().catch(() => {
      Surface.hasOnboarded().then(done => setOnboarded(done));
    });
  }, []);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 1000, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    const cycle = () => {
      Animated.timing(statusOpacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
        setStatusIdx(i => (i + 1) % STATUS_CYCLE.length);
        Animated.timing(statusOpacity, { toValue: 1, duration: 450, useNativeDriver: true }).start();
      });
    };
    const t  = setInterval(cycle, STATUS_INTERVAL_MS);
    const tc = setTimeout(() => setShowContinue(true), STATUS_INTERVAL_MS * 2);
    return () => { clearInterval(t); clearTimeout(tc); };
  }, []);

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

  useEffect(() => {
    const runScan = () => {
      scanAnim.setValue(-2);
      Animated.timing(scanAnim, {
        toValue: WIN.height + 2,
        duration: 4200,
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => { if (finished) runScan(); });
    };
    runScan();
    return () => scanAnim.stopAnimation();
  }, []);

  const navigate = () => {
    if (onboarded === null) return;
    router.replace(onboarded ? '/(tabs)' : '/onboarding');
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeIn }]}>

      {/* Scan line */}
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

        {/* Noise field */}
        <View style={styles.noiseSection}>
          {noiseLines.map((line, i) => (
            <Text key={i} style={[styles.noiseText, { opacity: 0.14 + i * 0.06 }]}>{line}</Text>
          ))}
        </View>

        {/* ── DNA Butterfly — the heart of the loading screen ── */}
        <View style={styles.butterflySection}>
          <ButterflyDNA size={190} />
        </View>

        {/* Empowering status */}
        <Animated.Text style={[styles.statusText, { opacity: statusOpacity }]}>
          {STATUS_CYCLE[statusIdx]}
        </Animated.Text>

        {/* Subtext — always sanctuary */}
        <Text style={styles.sanctuaryLabel}>this is your sanctuary</Text>

        {/* Binary field */}
        <View style={styles.binarySection}>
          {binaryLines.map((line, i) => (
            <Text key={i} style={[styles.binaryText, { opacity: 0.10 + i * 0.07 }]}>{line}</Text>
          ))}
        </View>

        {/* Continue */}
        {showContinue && (
          <TouchableOpacity style={styles.continueBtn} onPress={navigate} activeOpacity={0.7}>
            <Text style={styles.continueBtnText}>enter →</Text>
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 16,
  },
  noiseSection: { width: '100%', alignItems: 'flex-start', gap: 3 },
  noiseText: { fontFamily: 'CourierPrime', fontSize: 11, color: THEME.gold, letterSpacing: 1.5 },
  butterflySection: { alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  statusText: {
    fontFamily: 'CourierPrime',
    fontSize: 12,
    color: `${THEME.accent}90`,
    letterSpacing: 3,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  sanctuaryLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    color: `${THEME.textMuted}50`,
    letterSpacing: 3,
    textTransform: 'lowercase',
    marginTop: -8,
  },
  binarySection: { width: '100%', alignItems: 'flex-end', gap: 3 },
  binaryText: { fontFamily: 'CourierPrime', fontSize: 11, color: THEME.accentSoft, letterSpacing: 2 },
  continueBtn: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: `${THEME.accent}45`,
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 40,
  },
  continueBtnText: { fontFamily: 'CourierPrime', fontSize: 13, color: THEME.accent, letterSpacing: 2 },
  wordmark: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    color: `${THEME.text}10`,
    letterSpacing: 6,
    textTransform: 'lowercase',
  },
});
ENDOFFILE
echo "  ✓ Fix 4: bridge screen with DNA butterfly + empowering messages"

# ─────────────────────────────────────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "✓ All sanctuary fixes applied."
echo "  git add -A && git commit -m 'fix: morning contrast, milestone label, dark toggle, butterfly bridge' && git push origin main"
echo "  cd artifacts/kataleya-app && npx expo start --tunnel --clear"
