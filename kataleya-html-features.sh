#!/bin/bash
# kataleya-html-features.sh
# Run from: ~/kataleya
# Adds: ButterflyLogo component, AmbientBackground, RainCard,
#       useToast hook, and wires them all into index.tsx.
# Usage: bash ~/kataleya-html-features.sh

set -e
APP="artifacts/kataleya-app"
echo "→ Adding HTML features to Kataleya..."

# ─────────────────────────────────────────────────────────────────────────────
# 1. components/ButterflyLogo.tsx
#    SVG butterfly from HTML .butterfly-logo — animated pulse
#    Renders the exact butterfly shape from the HTML mask SVG paths
# ─────────────────────────────────────────────────────────────────────────────
cat > "$APP/components/ButterflyLogo.tsx" << 'ENDOFFILE'
'use no memo';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

interface Props {
  size?: number;
}

// Butterfly SVG from the HTML prototype butterfly-logo mask paths.
// Wings are drawn as bezier curves from centre point (50,50).
// Gradient: sage #87a878 → terra #d4a373 — matches HTML linear-gradient.
export function ButterflyLogo({ size = 36 }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Matches HTML @keyframes logo-pulse — 3s ease-in-out infinite
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: pulse }], width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="wing-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#87a878" />
            <Stop offset="100%" stopColor="#d4a373" />
          </LinearGradient>
        </Defs>
        {/* Left wing */}
        <Path
          d="M50 50 Q20 10 10 30 Q5 50 20 55 Q35 60 50 50"
          fill="url(#wing-grad)"
          opacity={0.9}
        />
        {/* Right wing */}
        <Path
          d="M50 50 Q80 10 90 30 Q95 50 80 55 Q65 60 50 50"
          fill="url(#wing-grad)"
          opacity={0.9}
        />
        {/* Body */}
        <Path
          d="M50 50 L50 78"
          stroke="url(#wing-grad)"
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* Head */}
        <Circle cx={50} cy={44} r={4} fill="url(#wing-grad)" />
      </Svg>
    </Animated.View>
  );
}
ENDOFFILE
echo "  ✓ components/ButterflyLogo.tsx"

# ─────────────────────────────────────────────────────────────────────────────
# 2. components/AmbientBackground.tsx
#    Matches HTML .ambient-bg — two radial sage/terra gradients,
#    slow drift animation. Absolute fill, pointer-events: none.
# ─────────────────────────────────────────────────────────────────────────────
cat > "$APP/components/AmbientBackground.tsx" << 'ENDOFFILE'
'use no memo';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

// Matches HTML .ambient-bg — radial sage + terra gradients drifting slowly.
// Two fixed radial blobs: sage at 20%/50%, terra at 80%/80%.
export function AmbientBackground() {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Matches HTML ambientShift — 20s ease-in-out infinite
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 10000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 10000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const sageTranslate = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 30],
  });
  const terraTranslate = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Sage blob — top-left, matches HTML 20% 50% */}
      <Animated.View
        style={[
          styles.blob,
          styles.sageBlob,
          { transform: [{ translateX: sageTranslate }, { translateY: sageTranslate }] },
        ]}
      />
      {/* Terra blob — bottom-right, matches HTML 80% 80% */}
      <Animated.View
        style={[
          styles.blob,
          styles.terraBlob,
          { transform: [{ translateX: terraTranslate }, { translateY: terraTranslate }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.3,
  },
  sageBlob: {
    width: 340,
    height: 340,
    top: '20%',
    left: '-20%',
    backgroundColor: 'rgba(135,168,120,0.18)',
  },
  terraBlob: {
    width: 280,
    height: 280,
    bottom: '5%',
    right: '-15%',
    backgroundColor: 'rgba(212,163,115,0.12)',
  },
});
ENDOFFILE
echo "  ✓ components/AmbientBackground.tsx"

# ─────────────────────────────────────────────────────────────────────────────
# 3. components/RainCard.tsx
#    Butterfly quote card with animated rain drops.
#    Matches HTML .inspiration-card + .rain-drops + createRainDrops().
#    Always visible (not mood-gated like ButterflyCard).
# ─────────────────────────────────────────────────────────────────────────────
cat > "$APP/components/RainCard.tsx" << 'ENDOFFILE'
'use no memo';
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing, Dimensions,
} from 'react-native';

const { width: SW } = Dimensions.get('window');
const DROP_COUNT = 20;

// Single rain drop — mirrors HTML .rain-drop css animation
function RainDrop({ x, delay, duration }: { x: number; delay: number; duration: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-24, 200],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 0.08, 0.88, 1],
    outputRange: [0, 0.25, 0.25, 0],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: 0,
        width: 1.5,
        height: 20,
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderRadius: 1,
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

interface Props {
  accentRgb?: string;
}

export function RainCard({ accentRgb = '135,168,120' }: Props) {
  // Generate drop params once
  const drops = useRef(
    Array.from({ length: DROP_COUNT }, () => ({
      x: Math.random() * (SW - 48),
      delay: Math.random() * 3000,
      duration: 2000 + Math.random() * 1000,
    }))
  ).current;

  return (
    <View style={[styles.card, { borderColor: `rgba(${accentRgb}, 0.15)` }]}>
      {/* Rain drops — absolute fill behind text */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {drops.map((d, i) => (
          <RainDrop key={i} x={d.x} delay={d.delay} duration={d.duration} />
        ))}
      </View>

      {/* Giant butterfly watermark — matches HTML ::before content:'🦋' */}
      <Text style={styles.watermark}>🦋</Text>

      {/* Quote */}
      <Text style={styles.quote}>
        "Butterflies rest when it rains because it damages their wings.
        It's okay to rest during the storms of life.
        You will fly again when it's over."
      </Text>
      <Text style={[styles.attribution, { color: `rgba(${accentRgb}, 0.55)` }]}>
        — rest, then rise
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    overflow: 'hidden',
    alignItems: 'center',
    // sage → terra gradient fill — matches HTML inspiration-card
    backgroundColor: 'rgba(135,168,120,0.06)',
  },
  watermark: {
    position: 'absolute',
    top: -16,
    right: -16,
    fontSize: 90,
    opacity: 0.05,
    transform: [{ rotate: '-15deg' }],
  },
  quote: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    color: 'rgba(245,245,245,0.88)',
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
    letterSpacing: 0.3,
    position: 'relative',
  },
  attribution: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 12,
    textTransform: 'lowercase',
  },
});
ENDOFFILE
echo "  ✓ components/RainCard.tsx"

# ─────────────────────────────────────────────────────────────────────────────
# 4. hooks/useToast.ts
#    Matches HTML App.showToast() — non-intrusive 3s bottom toast.
# ─────────────────────────────────────────────────────────────────────────────
cat > "$APP/hooks/useToast.ts" << 'ENDOFFILE'
import { useRef, useCallback } from 'react';
import { Animated, Easing } from 'react-native';

// Matches HTML App.showToast() — 3s auto-dismiss, slide up/down
export function useToast() {
  const opacity   = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const messageRef = useRef('');
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    messageRef.current = message;
    if (timerRef.current) clearTimeout(timerRef.current);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();

    timerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 20, duration: 300, useNativeDriver: true }),
      ]).start();
    }, 3000);
  }, [opacity, translateY]);

  return { opacity, translateY, messageRef, showToast };
}
ENDOFFILE
echo "  ✓ hooks/useToast.ts"

# ─────────────────────────────────────────────────────────────────────────────
# 5. app/(tabs)/index.tsx — full rewrite wiring all new components
# ─────────────────────────────────────────────────────────────────────────────
cat > "$APP/app/(tabs)/index.tsx" << 'ENDOFFILE'
'use no memo';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCircadian } from '@/hooks/useCircadian';
import { useSobriety } from '@/hooks/useSobriety';
import { useOrchidSway } from '@/hooks/useOrchidSway';
import { useNotifications } from '@/hooks/useNotifications';
import { useResponsiveHeart } from '@/hooks/useResponsiveHeart';
import { useToast } from '@/hooks/useToast';
import { DataBridge } from '@/components/DataBridge';
import { GhostPulseOrb } from '@/components/GhostPulseOrb';
import { NeonCard, NEON_RGB } from '@/components/NeonCard';
import { CircadianBadge } from '@/components/CircadianBadge';
import { BreathingExercise } from '@/components/BreathingExercise';
import { GroundingExercise } from '@/components/GroundingExercise';
import { ButterflyLogo } from '@/components/ButterflyLogo';
import { AmbientBackground } from '@/components/AmbientBackground';
import { RainCard } from '@/components/RainCard';
import { TAB_BAR_HEIGHT } from '@/constants/circadian';
import { BLOOM_THRESHOLDS } from '@/utils/hapticBloom';
import { Surface, Sanctuary } from '@/utils/storage';

const pad = (n: number) => String(n).padStart(2, '0');

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function greetPhrase(phase: string): string {
  if (phase === 'dawn') return 'good morning';
  if (phase === 'day') return 'good afternoon';
  if (phase === 'goldenHour') return 'good evening';
  return 'good night';
}

function phaseAccentRgb(phase: string): string {
  if (phase === 'goldenHour') return NEON_RGB.violet;
  if (phase === 'night')      return NEON_RGB.amber;
  if (phase === 'dawn')       return NEON_RGB.pink;
  return NEON_RGB.cyan;
}

async function getPredictiveSuggestion(phase: string): Promise<string | null> {
  try {
    const logs = await Sanctuary.getMoodLogs(20);
    if (logs.length < 5) return null;
    const phaseLogs = logs.filter(l => l.circadianPhase === phase);
    if (phaseLogs.length < 3) return null;
    const avg = phaseLogs.reduce((s, l) => s + l.moodScore, 0) / phaseLogs.length;
    const overall = logs.reduce((s, l) => s + l.moodScore, 0) / logs.length;
    if (avg < overall - 0.8) {
      const label = phase === 'goldenHour' ? 'golden hour'
        : phase === 'night' ? 'night'
        : phase === 'dawn'  ? 'early morning'
        : 'afternoon';
      return `${label} has felt harder lately. want to breathe for a moment?`;
    }
    return null;
  } catch {
    return null;
  }
}

export default function SanctuaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, phase, phaseConfig } = useCircadian();
  const { sobriety, setStartDate } = useSobriety();
  const { restlessnessScore } = useOrchidSway();
  const { biometrics, systemState } = useResponsiveHeart(phase);
  const { opacity: toastOpacity, translateY: toastTranslate, messageRef, showToast } = useToast();
  useNotifications(sobriety.daysSober);

  const [settingDate, setSettingDate]           = useState(false);
  const [userName, setUserName]                 = useState<string | null>(null);
  const [showBreathing, setShowBreathing]       = useState(false);
  const [showGrounding, setShowGrounding]       = useState(false);
  const [suggestion, setSuggestion]             = useState<string | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);

  const dayPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const breathe = () => {
      Animated.sequence([
        Animated.timing(dayPulse, { toValue: 1.04, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(dayPulse, { toValue: 1.0,  duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) breathe(); });
    };
    breathe();
    return () => dayPulse.stopAnimation();
  }, [dayPulse]);

  const [pickerDate, setPickerDate] = useState<Date>(
    sobriety.startDate ? new Date(sobriety.startDate) : new Date()
  );
  const panicRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevDaysSober  = useRef(sobriety.daysSober);

  useEffect(() => { Surface.getName().then(n => setUserName(n ?? null)); }, []);
  useEffect(() => { getPredictiveSuggestion(phase).then(s => setSuggestion(s)); }, [phase]);

  useEffect(() => {
    if (!sobriety.loaded) return;
    const prev = prevDaysSober.current;
    const curr = sobriety.daysSober;
    if (curr !== prev) {
      for (const threshold of BLOOM_THRESHOLDS) {
        if (prev < threshold.days && curr >= threshold.days) {
          threshold.fire();
          showToast(`🦋 ${threshold.label} milestone reached`);
          break;
        }
      }
      prevDaysSober.current = curr;
    }
  }, [sobriety.daysSober, sobriety.loaded]);

  const handlePanicStart = () => {
    panicRef.current = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      router.push('/cover');
    }, 1500);
  };
  const handlePanicEnd = () => { if (panicRef.current) clearTimeout(panicRef.current); };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + TAB_BAR_HEIGHT : insets.bottom + TAB_BAR_HEIGHT;

  const bgLum = (() => {
    const n = parseInt(theme.bg.replace('#', ''), 16);
    return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  })();
  const pickerVariant: 'dark' | 'light' = bgLum < 128 ? 'dark' : 'light';

  const handleConfirmDate = async () => {
    await setStartDate(pickerDate.toISOString());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSettingDate(false);
    showToast('sobriety date updated');
  };

  const accentRgb = phaseAccentRgb(phase);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>

      {/* ── Ambient background — sage/terra radial blobs ── */}
      <AmbientBackground />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 12, paddingBottom: botPad + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Greeting */}
        {userName ? (
          <Text style={[styles.greeting, { color: `rgba(${accentRgb}, 0.65)` }]}>
            {greetPhrase(phase)}, {userName.toLowerCase()}
          </Text>
        ) : null}

        {/* ── Header — butterfly logo + wordmark + circadian badge ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPressIn={handlePanicStart}
            onPressOut={handlePanicEnd}
            activeOpacity={1}
            hitSlop={8}
            style={styles.logoContainer}
          >
            <ButterflyLogo size={32} />
            <Text style={[styles.logoText, { color: `rgba(${accentRgb}, 0.9)` }]}>
              kataleya
            </Text>
          </TouchableOpacity>
          <CircadianBadge theme={theme} phaseConfig={phaseConfig} />
        </View>

        {/* ── Rain card — butterfly quote, always visible ── */}
        <RainCard accentRgb={accentRgb} />

        {/* ── Ghost Pulse Orb ── */}
        <View style={styles.orbSection}>
          <GhostPulseOrb
            theme={theme}
            phase={phase}
            daysSober={sobriety.daysSober}
            restlessnessScore={restlessnessScore}
            systemState={systemState}
            bpm={biometrics.bpm}
          />
        </View>

        {/* Timer */}
        {sobriety.startDate ? (
          <View style={styles.timerSection}>
            <Animated.Text style={[styles.dayCount, { color: `rgba(${accentRgb}, 0.95)`, transform: [{ scale: dayPulse }] }]}>
              {sobriety.daysSober}
            </Animated.Text>
            <Text style={[styles.dayLabel, { color: `rgba(${accentRgb}, 0.45)` }]}>
              days in sanctuary
            </Text>
            <Text style={[styles.hmsCount, { color: `${theme.text}60` }]}>
              {pad(sobriety.hoursSober)}:{pad(sobriety.minutesSober)}:{pad(sobriety.secondsSober)}
            </Text>

            {sobriety.nextMilestone && (
              <View style={styles.progressSection}>
                <View style={[styles.progressTrack, { backgroundColor: `rgba(${accentRgb}, 0.12)` }]}>
                  <View style={[styles.progressFill, { width: `${sobriety.progressToNext * 100}%`, backgroundColor: `rgba(${accentRgb}, 0.7)` }]} />
                </View>
                <Text style={[styles.nextLabel, { color: `rgba(${accentRgb}, 0.45)` }]}>
                  {sobriety.nextMilestone.days - sobriety.daysSober} days to{' '}
                  <Text style={{ color: `rgba(${accentRgb}, 0.8)` }}>{sobriety.nextMilestone.label}</Text>
                </Text>
              </View>
            )}
            {!sobriety.nextMilestone && (
              <Text style={[styles.nextLabel, { color: `rgba(${accentRgb}, 0.6)` }]}>∞ all milestones achieved</Text>
            )}

            <TouchableOpacity onPress={() => setSettingDate(v => !v)} style={styles.adjustBtn}>
              <Text style={[styles.adjustText, { color: `${theme.textMuted}70` }]}>
                {settingDate ? 'cancel' : 'adjust date'}
              </Text>
            </TouchableOpacity>

            {settingDate && (
              <View style={styles.datePickerArea}>
                {Platform.OS !== 'web' ? (
                  <View style={[styles.pickerCard, { backgroundColor: theme.surface, borderColor: `rgba(${accentRgb}, 0.2)` }]}>
                    <DateTimePicker
                      value={pickerDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                      maximumDate={new Date()}
                      onChange={(_e, date) => {
                        if (date) { setPickerDate(date); if (Platform.OS === 'android') handleConfirmDate(); }
                      }}
                      themeVariant={pickerVariant}
                      accentColor={theme.accent}
                    />
                  </View>
                ) : (
                  <View style={[styles.webDateCard, { backgroundColor: theme.surface, borderColor: `rgba(${accentRgb}, 0.2)` }]}>
                    <Text style={[styles.webDateLabel, { color: theme.textMuted }]}>select date</Text>
                    <input
                      type="date"
                      defaultValue={pickerDate.toISOString().split('T')[0]}
                      max={new Date().toISOString().split('T')[0]}
                      style={{ background: 'transparent', border: 'none', color: theme.text, fontFamily: 'CourierPrime', fontSize: 16, width: '100%', outline: 'none', padding: '4px 0' }}
                      onChange={(e) => { const d = new Date(e.target.value); if (!isNaN(d.getTime())) setPickerDate(d); }}
                    />
                  </View>
                )}
                {(Platform.OS === 'ios' || Platform.OS === 'web') && (
                  <View style={styles.pickerFooter}>
                    {Platform.OS === 'ios' && (
                      <Text style={[styles.pickerSelected, { color: theme.textMuted }]}>{formatDate(pickerDate)}</Text>
                    )}
                    <TouchableOpacity
                      style={[styles.confirmBtn, { borderColor: `rgba(${accentRgb}, 0.4)`, backgroundColor: `rgba(${accentRgb}, 0.1)`, flex: Platform.OS === 'ios' ? 0 : 1 }]}
                      onPress={handleConfirmDate}
                    >
                      <Text style={[styles.confirmBtnText, { color: `rgba(${accentRgb}, 0.9)` }]}>confirm</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.setupSection}>
            <Text style={[styles.setupTitle, { color: `rgba(${accentRgb}, 0.55)` }]}>the garden waits for you.</Text>
            <Text style={[styles.setupHint, { color: `${theme.textMuted}60` }]}>when you're ready, set your date below.</Text>
            {!settingDate ? (
              <TouchableOpacity
                style={[styles.enterBtn, { borderColor: `rgba(${accentRgb}, 0.35)`, backgroundColor: `rgba(${accentRgb}, 0.08)` }]}
                onPress={() => setSettingDate(true)}
              >
                <Text style={[styles.enterBtnText, { color: `rgba(${accentRgb}, 0.85)` }]}>begin tracking</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.datePickerArea}>
                {Platform.OS !== 'web' ? (
                  <View style={[styles.pickerCard, { backgroundColor: theme.surface, borderColor: `rgba(${accentRgb}, 0.2)` }]}>
                    <DateTimePicker
                      value={pickerDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                      maximumDate={new Date()}
                      onChange={(_e, date) => {
                        if (date) { setPickerDate(date); if (Platform.OS === 'android') handleConfirmDate(); }
                      }}
                      themeVariant={pickerVariant}
                      accentColor={theme.accent}
                    />
                  </View>
                ) : (
                  <View style={[styles.webDateCard, { backgroundColor: theme.surface, borderColor: `rgba(${accentRgb}, 0.2)` }]}>
                    <Text style={[styles.webDateLabel, { color: theme.textMuted }]}>select date</Text>
                    <input
                      type="date"
                      defaultValue={pickerDate.toISOString().split('T')[0]}
                      max={new Date().toISOString().split('T')[0]}
                      style={{ background: 'transparent', border: 'none', color: theme.text, fontFamily: 'CourierPrime', fontSize: 16, width: '100%', outline: 'none', padding: '4px 0' }}
                      onChange={(e) => { const d = new Date(e.target.value); if (!isNaN(d.getTime())) setPickerDate(d); }}
                    />
                  </View>
                )}
                <View style={styles.pickerFooter}>
                  <TouchableOpacity
                    style={[styles.confirmBtn, { borderColor: `rgba(${accentRgb}, 0.4)`, backgroundColor: `rgba(${accentRgb}, 0.1)`, flex: 1 }]}
                    onPress={handleConfirmDate}
                  >
                    <Text style={[styles.confirmBtnText, { color: `rgba(${accentRgb}, 0.9)` }]}>confirm</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setSettingDate(false)}>
                  <Text style={[styles.adjustText, { color: `${theme.textMuted}70` }]}>cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Predictive suggestion ── */}
        {suggestion && !suggestionDismissed && (
          <NeonCard theme={theme} accentRgb={accentRgb} borderIntensity={0.22} fillIntensity={0.07} style={styles.suggestionCard}>
            <View style={styles.suggestionInner}>
              <View style={styles.suggestionText}>
                <Text style={[styles.suggestionLabel, { color: `rgba(${accentRgb}, 0.55)` }]}>pattern</Text>
                <Text style={[styles.suggestionBody, { color: `${theme.text}cc` }]}>{suggestion}</Text>
              </View>
              <View style={styles.suggestionActions}>
                <TouchableOpacity onPress={() => { setShowBreathing(true); setSuggestionDismissed(true); }}>
                  <Text style={[styles.suggestionAction, { color: `rgba(${accentRgb}, 0.85)` }]}>breathe</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSuggestionDismissed(true)}>
                  <Text style={[styles.suggestionDismiss, { color: `${theme.textMuted}55` }]}>×</Text>
                </TouchableOpacity>
              </View>
            </View>
          </NeonCard>
        )}

        {/* ── Mindfulness tiles — breathe / ground ── */}
        <View style={styles.mindfulSection}>
          <Text style={[styles.mindfulLabel, { color: `rgba(${accentRgb}, 0.35)` }]}>mindfulness</Text>
          <View style={styles.mindfulRow}>
            <NeonCard theme={theme} glowColor="cyan" style={styles.mindfulCard} onPress={() => setShowBreathing(true)}>
              <Text style={[styles.mindfulGlyph, { color: `rgba(${NEON_RGB.cyan}, 0.85)` }]}>🌊</Text>
              <Text style={[styles.mindfulCardTitle, { color: `rgba(${NEON_RGB.cyan}, 0.9)` }]}>breathe</Text>
              <Text style={[styles.mindfulCardSub, { color: `rgba(${NEON_RGB.cyan}, 0.4)` }]}>4 — 7 — 8</Text>
            </NeonCard>
            <NeonCard theme={theme} glowColor="violet" style={styles.mindfulCard} onPress={() => setShowGrounding(true)}>
              <Text style={[styles.mindfulGlyph, { color: `rgba(${NEON_RGB.violet}, 0.85)` }]}>🧘</Text>
              <Text style={[styles.mindfulCardTitle, { color: `rgba(${NEON_RGB.violet}, 0.9)` }]}>ground</Text>
              <Text style={[styles.mindfulCardSub, { color: `rgba(${NEON_RGB.violet}, 0.4)` }]}>5 — 4 — 3 — 2 — 1</Text>
            </NeonCard>
          </View>
        </View>

        {/* DataBridge + phase description */}
        <View style={styles.heartSection}>
          <DataBridge phase={phase} theme={theme} size="large" />
          <Text style={[styles.phaseDesc, { color: `${theme.textMuted}80` }]}>{phaseConfig.description}</Text>
          <TouchableOpacity onPress={() => router.push('/privacy')} hitSlop={8}>
            <Text style={[styles.privacyLink, { color: `${theme.textMuted}40` }]}>privacy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Modals ── */}
      <BreathingExercise visible={showBreathing} onClose={() => setShowBreathing(false)} theme={theme} />
      <GroundingExercise visible={showGrounding} onClose={() => setShowGrounding(false)} theme={theme} />

      {/* ── Toast — matches HTML App.showToast() ── */}
      <Animated.View
        style={[
          styles.toast,
          { opacity: toastOpacity, transform: [{ translateY: toastTranslate }] },
          { bottom: botPad + 12 },
        ]}
        pointerEvents="none"
      >
        <Text style={styles.toastText}>{messageRef.current}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 24, alignItems: 'center', gap: 12 },
  greeting: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 2, textTransform: 'lowercase', width: '100%', marginBottom: 2 },
  header: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoText: { fontFamily: 'CourierPrime', fontSize: 18, letterSpacing: 3, fontWeight: '300', textTransform: 'lowercase' },
  orbSection: { alignItems: 'center', marginVertical: 8 },
  timerSection: { alignItems: 'center', gap: 6, width: '100%' },
  dayCount: { fontFamily: 'CourierPrime', fontSize: 64, fontWeight: '700', lineHeight: 72, letterSpacing: -1 },
  dayLabel: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' },
  hmsCount: { fontFamily: 'CourierPrime', fontSize: 20, letterSpacing: 2, marginTop: 2 },
  progressSection: { width: '100%', gap: 8, marginTop: 12 },
  progressTrack: { height: 2, borderRadius: 1, width: '100%', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 1 },
  nextLabel: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 1, textAlign: 'center' },
  adjustBtn: { marginTop: 8 },
  adjustText: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 2, textTransform: 'lowercase', textAlign: 'center' },
  datePickerArea: { width: '100%', gap: 10, marginTop: 4 },
  pickerCard: { borderWidth: 1, borderRadius: 12, paddingVertical: 8 },
  webDateCard: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  webDateLabel: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  pickerFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  pickerSelected: { fontFamily: 'CourierPrime', fontSize: 12, letterSpacing: 0.5 },
  confirmBtn: { borderWidth: 1, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  confirmBtnText: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 1.5, textTransform: 'lowercase' },
  setupSection: { alignItems: 'center', gap: 10, width: '100%' },
  setupTitle: { fontFamily: 'CourierPrime', fontSize: 15, letterSpacing: 1, textTransform: 'lowercase', textAlign: 'center' },
  setupHint: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 0.5, textAlign: 'center' },
  enterBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 13, paddingHorizontal: 28, alignItems: 'center', width: '100%' },
  enterBtnText: { fontFamily: 'CourierPrime', fontSize: 13, letterSpacing: 2, textTransform: 'lowercase' },
  suggestionCard: { width: '100%' },
  suggestionInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  suggestionText: { flex: 1, gap: 3 },
  suggestionLabel: { fontFamily: 'CourierPrime', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase' },
  suggestionBody: { fontFamily: 'CourierPrime', fontSize: 12, letterSpacing: 0.4, lineHeight: 18 },
  suggestionActions: { alignItems: 'center', gap: 8 },
  suggestionAction: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 1.5, textTransform: 'lowercase' },
  suggestionDismiss: { fontFamily: 'CourierPrime', fontSize: 16, lineHeight: 18 },
  mindfulSection: { width: '100%', gap: 10, marginTop: 4 },
  mindfulLabel: { fontFamily: 'CourierPrime', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', textAlign: 'center' },
  mindfulRow: { flexDirection: 'row', gap: 10 },
  mindfulCard: { flex: 1, paddingVertical: 18, paddingHorizontal: 12, alignItems: 'center', gap: 6 },
  mindfulGlyph: { fontSize: 24, lineHeight: 28 },
  mindfulCardTitle: { fontFamily: 'CourierPrime', fontSize: 13, letterSpacing: 2, textTransform: 'lowercase', fontWeight: '700' },
  mindfulCardSub: { fontFamily: 'CourierPrime', fontSize: 9, letterSpacing: 1.5, textAlign: 'center' },
  heartSection: { alignItems: 'center', gap: 8, marginTop: 16, paddingBottom: 8, width: '100%' },
  phaseDesc: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 1, textAlign: 'center', lineHeight: 18, maxWidth: 280 },
  privacyLink: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 2, textTransform: 'lowercase', marginTop: 4 },
  // Toast — matches HTML .toast positioning
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(26,26,46,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(135,168,120,0.25)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    maxWidth: 300,
  },
  toastText: {
    fontFamily: 'CourierPrime',
    fontSize: 12,
    color: 'rgba(245,245,245,0.9)',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
ENDOFFILE
echo "  ✓ app/(tabs)/index.tsx"

echo ""
echo "✓ HTML features applied. Now commit:"
echo "  git add -A && git commit -m 'feat: butterfly logo, ambient bg, rain card, toast notification' && git push origin main"
ENDOFFILE
echo "Script written."
