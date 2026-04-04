#!/bin/bash
# kataleya-theme-merge.sh
# Run from: ~/kataleya
# Writes the merged HTML+Kataleya palette across all affected files.
# Usage: bash ~/kataleya-theme-merge.sh

set -e
APP="artifacts/kataleya-app"

echo "→ Merging HTML prototype palette into Kataleya..."

# ─────────────────────────────────────────────────────────────────────────────
# 1. constants/theme.ts
# ─────────────────────────────────────────────────────────────────────────────
cat > "$APP/constants/theme.ts" << 'ENDOFFILE'
export interface ThemeTokens {
  bg: string;
  surface: string;
  surfaceHighlight: string;
  gold: string;
  accent: string;
  accentSoft: string;
  text: string;
  textMuted: string;
  textInverse: string;
  success: string;
  warning: string;
  danger: string;
  border: string;
}

// Dawn / day — warm parchment (unchanged)
export const MorningBloom: ThemeTokens = {
  bg:               '#faf8f5',
  surface:          '#ffffff',
  surfaceHighlight: '#f5f0e8',
  gold:             '#a06808',
  accent:           '#b85510',
  accentSoft:       '#9a7210',
  text:             '#2a1810',
  textMuted:        '#6b5540',
  textInverse:      '#faf8f5',
  success:          '#1f7a6e',
  warning:          '#9a7210',
  danger:           '#c0401e',
  border:           '#d0c0a8',
};

// Golden hour → night — merged HTML navy+sage+terra palette
// HTML --bg-dark #1a1a2e, --primary-sage #87a878, --primary-terra #d4a373
// --safe #81b29a, --danger #e07a5f, --warning #f2cc8f
export const MidnightGarden: ThemeTokens = {
  bg:               '#1a1a2e',   // HTML --bg-dark       (was #0e0c14)
  surface:          '#16213e',   // HTML gradient end    (was #1a1625)
  surfaceHighlight: '#1e2a4a',   // one step lighter
  gold:             '#d4a373',   // HTML --primary-terra (was #e8c56a)
  accent:           '#87a878',   // HTML --primary-sage  (was #7fc9c9)
  accentSoft:       '#81b29a',   // HTML --safe          (was #9b6dff)
  text:             '#f5f5f5',   // HTML --text-primary  (was #f0e6ff)
  textMuted:        '#a0a0a0',   // HTML --text-secondary (was #a89bb8)
  textInverse:      '#1a1a2e',
  success:          '#81b29a',   // HTML --safe
  warning:          '#f2cc8f',   // HTML --warning
  danger:           '#e07a5f',   // HTML --danger        (was #ff6b6b)
  border:           '#1e2a4a',   // deep navy            (was #2a2440)
};

export function interpolateTheme(
  morning: ThemeTokens,
  midnight: ThemeTokens,
  t: number
): ThemeTokens {
  const lerp = (a: string, b: string, t: number): string => {
    const parseHex = (hex: string) => {
      const n = parseInt(hex.replace('#', ''), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const toHex = (r: number, g: number, b: number) =>
      '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    const [r1, g1, b1] = parseHex(a);
    const [r2, g2, b2] = parseHex(b);
    return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
  };
  const keys = Object.keys(morning) as (keyof ThemeTokens)[];
  return keys.reduce((acc, key) => {
    acc[key] = lerp(morning[key], midnight[key], t);
    return acc;
  }, {} as ThemeTokens);
}
ENDOFFILE
echo "  ✓ constants/theme.ts"

# ─────────────────────────────────────────────────────────────────────────────
# 2. constants/colors.ts
# ─────────────────────────────────────────────────────────────────────────────
cat > "$APP/constants/colors.ts" << 'ENDOFFILE'
export default {
  light: {
    text: '#2a1810',
    background: '#faf8f5',
    tint: '#b85510',
    tabIconDefault: '#8b7355',
    tabIconSelected: '#b85510',
  },
  dark: {
    text: '#f5f5f5',
    background: '#1a1a2e',
    tint: '#87a878',
    tabIconDefault: '#a0a0a0',
    tabIconSelected: '#87a878',
  },
};
ENDOFFILE
echo "  ✓ constants/colors.ts"

# ─────────────────────────────────────────────────────────────────────────────
# 3. components/NeonCard.tsx
# NEON_RGB: cyan→sage, violet→terra, amber→safe, pink→coral
# Key names kept so no call sites break.
# ─────────────────────────────────────────────────────────────────────────────
cat > "$APP/components/NeonCard.tsx" << 'ENDOFFILE'
'use no memo';
import React from 'react';
import { View, TouchableOpacity, ViewStyle } from 'react-native';
import { ThemeTokens } from '@/constants/theme';

export type NeonGlowColor = 'cyan' | 'violet' | 'amber' | 'pink' | 'neutral';

// Organic palette — merged from HTML prototype
// cyan   = sage    #87a878  day / water / breathing / mood
// violet = terra   #d4a373  golden hour / journal / light signal
// amber  = safe    #81b29a  Fortress vault / grounding
// pink   = coral   #e07a5f  dawn / burn / danger-adjacent
export const NEON_RGB: Record<NeonGlowColor, string> = {
  cyan:    '135,168,120',
  violet:  '212,163,115',
  amber:   '129,178,154',
  pink:    '224,122,95',
  neutral: '255,255,255',
};

interface Props {
  children: React.ReactNode;
  theme: ThemeTokens;
  accentRgb?: string;
  glowColor?: NeonGlowColor;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
  borderIntensity?: number;
  fillIntensity?: number;
  disabled?: boolean;
}

export function NeonCard({
  children, theme, accentRgb, glowColor, onPress, onLongPress,
  style, borderIntensity = 0.18, fillIntensity = 0.06, disabled = false,
}: Props) {
  const rgb = accentRgb ?? (glowColor ? NEON_RGB[glowColor] : NEON_RGB.neutral);
  const cardStyle: ViewStyle = {
    backgroundColor: `rgba(${rgb}, ${fillIntensity})`,
    borderWidth: 1,
    borderColor: `rgba(${rgb}, ${borderIntensity})`,
    borderRadius: 16,
    overflow: 'hidden',
  };
  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
        onPress={onPress} onLongPress={onLongPress}
        disabled={disabled} activeOpacity={0.75} style={[cardStyle, style]}
      >
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={[cardStyle, style]}>{children}</View>;
}
ENDOFFILE
echo "  ✓ components/NeonCard.tsx"

# ─────────────────────────────────────────────────────────────────────────────
# 4. app/_layout.tsx — replace hardcoded #0e0c14 with #1a1a2e
# ─────────────────────────────────────────────────────────────────────────────
sed -i "s/#0e0c14/#1a1a2e/g" "$APP/app/_layout.tsx"
echo "  ✓ app/_layout.tsx (sed)"

# ─────────────────────────────────────────────────────────────────────────────
# 5. components/ErrorFallback.tsx
# ─────────────────────────────────────────────────────────────────────────────
sed -i "s/#0e0c14/#1a1a2e/g; s/#7fc9c9/#87a878/g" "$APP/components/ErrorFallback.tsx"
echo "  ✓ components/ErrorFallback.tsx (sed)"

# ─────────────────────────────────────────────────────────────────────────────
# 6. components/SignalIcons.tsx
# Water signal: cyan #7fc9c9 → sage #87a878
# Light signal: amber #e8c56a → terra #d4a373
# ─────────────────────────────────────────────────────────────────────────────
sed -i "s/#7fc9c9/#87a878/g; s/#e8c56a/#d4a373/g" "$APP/components/SignalIcons.tsx"
echo "  ✓ components/SignalIcons.tsx (sed)"

# ─────────────────────────────────────────────────────────────────────────────
# 7. components/GroundingExercise.tsx
# cyan #7fc9c9 → sage #87a878
# violet #9b6dff → terra #d4a373
# amber #e8c56a → safe #81b29a
# pink #d0607a → coral #e07a5f
# ─────────────────────────────────────────────────────────────────────────────
sed -i "s/#7fc9c9/#87a878/g; s/#9b6dff/#d4a373/g; s/#e8c56a/#81b29a/g; s/#d0607a/#e07a5f/g" \
  "$APP/components/GroundingExercise.tsx"
echo "  ✓ components/GroundingExercise.tsx (sed)"

# ─────────────────────────────────────────────────────────────────────────────
# 8. components/BreathingExercise.tsx — full rewrite to match HTML orb style
# ─────────────────────────────────────────────────────────────────────────────
cat > "$APP/components/BreathingExercise.tsx" << 'ENDOFFILE'
'use no memo';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  Animated, Easing, Dimensions, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width: SW, height: SH } = Dimensions.get('window');

const PHASES = [
  { label: 'Inhale',  duration: 4,  scaleTarget: 1.5  },
  { label: 'Hold',    duration: 7,  scaleTarget: 1.5  },
  { label: 'Exhale',  duration: 8,  scaleTarget: 0.85 },
  { label: 'Hold',    duration: 4,  scaleTarget: 0.85 },
];
const TOTAL_CYCLES = 3;

// Matches HTML --primary-sage
const SAGE     = '135,168,120';
const SAGE_HEX = '#87a878';

interface Props {
  visible: boolean;
  onClose: () => void;
  theme: any;
}

export function BreathingExercise({ visible, onClose, theme }: Props) {
  const insets = useSafeAreaInsets();
  const [running, setRunning]     = useState(false);
  const [phaseIdx, setPhaseIdx]   = useState(0);
  const [countdown, setCountdown] = useState(PHASES[0].duration);
  const [cycles, setCycles]       = useState(0);
  const [done, setDone]           = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0.35)).current;
  const waveAnim  = useRef(new Animated.Value(0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const phase = PHASES[phaseIdx];

  const startWave = useCallback(() => {
    waveLoopRef.current?.stop();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(waveAnim, { toValue: 0, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    waveLoopRef.current = loop;
  }, [waveAnim]);

  const animateToPhase = useCallback((idx: number) => {
    const p = PHASES[idx];
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: p.scaleTarget,
        duration: Math.min(p.duration * 800, 5000),
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: p.label === 'Exhale' ? 0.2 : p.label === 'Inhale' ? 0.65 : 0.5,
        duration: 900,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, glowAnim]);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false); setPhaseIdx(0);
    setCountdown(PHASES[0].duration); setCycles(0); setDone(false);
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
      Animated.timing(glowAnim,  { toValue: 0.35, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, glowAnim]);

  useEffect(() => {
    if (visible) { startWave(); } else { waveLoopRef.current?.stop(); reset(); }
  }, [visible]);

  useEffect(() => {
    if (!running || done) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    animateToPhase(phaseIdx);
    intervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          const nextIdx = (phaseIdx + 1) % PHASES.length;
          if (nextIdx === 0) {
            setCycles(c => {
              const nc = c + 1;
              if (nc >= TOTAL_CYCLES) {
                clearInterval(intervalRef.current!);
                intervalRef.current = null;
                setRunning(false); setDone(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                return nc;
              }
              return nc;
            });
          }
          setPhaseIdx(nextIdx);
          setCountdown(PHASES[nextIdx].duration);
          return PHASES[nextIdx].duration;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, phaseIdx, done]);

  const togglePlay = () => {
    if (done) { reset(); return; }
    if (!running) {
      setRunning(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setRunning(false);
    }
  };

  const topPad = Platform.OS === 'web' ? 60 : insets.top + 20;
  const botPad = Platform.OS === 'web' ? 40 : insets.bottom + 20;
  const ORB = Math.min(SW * 0.52, 220);

  const wave1X = waveAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
  const wave2X = waveAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 20] });
  const wave3X = waveAnim.interpolate({ inputRange: [0, 1], outputRange: [15, -15] });

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent>
      <View style={[styles.overlay, { paddingTop: topPad, paddingBottom: botPad }]}>

        {/* Ocean wave bands */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Animated.View style={[styles.waveBand, styles.waveBand3, { transform: [{ translateX: wave3X }] }]} />
          <Animated.View style={[styles.waveBand, styles.waveBand2, { transform: [{ translateX: wave2X }] }]} />
          <Animated.View style={[styles.waveBand, styles.waveBand1, { transform: [{ translateX: wave1X }] }]} />
        </View>

        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.centerArea}>
          {/* Outer glow ring */}
          <Animated.View style={[styles.glowRing, {
            width: ORB + 80, height: ORB + 80,
            borderRadius: (ORB + 80) / 2,
            opacity: glowAnim,
            transform: [{ scale: scaleAnim }],
          }]} />
          {/* Main orb */}
          <Animated.View style={[styles.orb, {
            width: ORB, height: ORB, borderRadius: ORB / 2,
            transform: [{ scale: scaleAnim }],
            opacity: glowAnim,
          }]}>
            <Text style={styles.phaseText}>
              {running || done ? phase.label.toLowerCase() : 'breathe'}
            </Text>
            {running && !done && (
              <Text style={styles.countText}>{countdown}</Text>
            )}
          </Animated.View>
        </View>

        <Text style={styles.instruction}>4 counts in · 7 hold · 8 out</Text>

        <View style={styles.cycleRow}>
          {Array.from({ length: TOTAL_CYCLES }).map((_, i) => (
            <View key={i} style={[styles.cycleDot, {
              backgroundColor: i < cycles ? SAGE_HEX : `rgba(${SAGE}, 0.2)`,
            }]} />
          ))}
        </View>

        <View style={styles.controls}>
          <TouchableOpacity onPress={reset} style={styles.controlBtn} hitSlop={12}>
            <Text style={styles.controlIcon}>↺</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={togglePlay} style={[styles.playBtn, { backgroundColor: SAGE_HEX }]}>
            <Text style={styles.playIcon}>{running && !done ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
        </View>

        {done && (
          <View style={styles.completionOverlay}>
            <Text style={styles.completionGlyph}>✦</Text>
            <Text style={styles.completionTitle}>well done</Text>
            <Text style={styles.completionSub}>your nervous system thanks you.</Text>
            <TouchableOpacity onPress={onClose} style={[styles.completionBtn, { borderColor: SAGE_HEX }]}>
              <Text style={[styles.completionBtnText, { color: SAGE_HEX }]}>continue</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={reset} hitSlop={10}>
              <Text style={styles.completionAgain}>go again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    overflow: 'hidden',
  },
  waveBand: { position: 'absolute', left: -40, right: -40, borderTopLeftRadius: 60, borderTopRightRadius: 60 },
  waveBand1: { bottom: 0, height: SH * 0.38, backgroundColor: 'rgba(22,33,62,0.55)' },
  waveBand2: { bottom: 0, height: SH * 0.28, backgroundColor: 'rgba(16,24,48,0.6)' },
  waveBand3: { bottom: 0, height: SH * 0.18, backgroundColor: 'rgba(10,16,36,0.65)' },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: 'rgba(255,255,255,0.6)', fontSize: 18 },
  centerArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glowRing: {
    position: 'absolute',
    backgroundColor: 'rgba(135,168,120,0.1)',
    shadowColor: '#87a878',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 0,
  },
  orb: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(135,168,120,0.5)',
    shadowColor: '#87a878',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 50,
    elevation: 20,
    gap: 6,
  },
  phaseText: {
    fontFamily: 'CourierPrime', fontSize: 22, fontWeight: '300',
    color: '#ffffff', letterSpacing: 3, textTransform: 'lowercase',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
  },
  countText: {
    fontFamily: 'CourierPrime', fontSize: 36, fontWeight: '200',
    color: '#ffffff', letterSpacing: 1, opacity: 0.9,
  },
  instruction: {
    fontFamily: 'CourierPrime', fontSize: 13,
    color: 'rgba(160,160,160,0.85)', letterSpacing: 1, textAlign: 'center', marginBottom: 8,
  },
  cycleRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  cycleDot: { width: 8, height: 8, borderRadius: 4 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 8 },
  controlBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  controlIcon: { color: 'rgba(255,255,255,0.6)', fontSize: 20, fontFamily: 'CourierPrime' },
  playBtn: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  playIcon: { fontSize: 22, color: '#ffffff' },
  completionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,26,46,0.95)',
    alignItems: 'center', justifyContent: 'center', gap: 14,
  },
  completionGlyph: { fontSize: 40, color: '#87a878' },
  completionTitle: { fontFamily: 'CourierPrime', fontSize: 28, color: '#ffffff', letterSpacing: 4, fontWeight: '700' },
  completionSub: { fontFamily: 'CourierPrime', fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 },
  completionBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 40, marginTop: 8 },
  completionBtnText: { fontFamily: 'CourierPrime', fontSize: 13, letterSpacing: 2 },
  completionAgain: { fontFamily: 'CourierPrime', fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginTop: 4 },
});
ENDOFFILE
echo "  ✓ components/BreathingExercise.tsx"

# ─────────────────────────────────────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "✓ Theme merge complete. Commit with:"
echo "  git add -A && git commit -m 'feat: merge HTML navy+sage+terra palette into theme' && git push origin main"
ENDOFFILE
echo "  ✓ script written"