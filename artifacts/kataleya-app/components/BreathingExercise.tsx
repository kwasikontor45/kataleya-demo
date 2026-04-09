// components/BreathingExercise.tsx
// ─────────────────────────────────────────────────────────────────────────────
// NO play button. NO pause button. NO user interaction required to begin.
// The orb autostarts the moment the component mounts.
// The breath IS the app. The app IS breathing.
//
// Architecture:
//   • Three staggered rings animate at slightly different speeds/delays
//     so the expansion ripples outward — not a single synchronized pulse
//   • Core opacity + scale drives the primary breath feel
//   • Arc (SVG circle) traces inhale progress and drains on exhale
//   • Phase-aware timing: night breathes slower than day
//   • useResponsiveHeart BPM feeds the cycle duration
//   • restlessnessScore from useOrchidSway subtly affects ring amplitude
//   • "i feel it" dismiss — only appears after 2 complete cycles
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Modal,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useAnimatedTheme } from '@/hooks/useAnimatedTheme';
import { useCircadian } from '@/hooks/useCircadian';
import { useOrchidSway } from '@/hooks/useOrchidSway';
import { useResponsiveHeart } from '@/hooks/useResponsiveHeart';

const { width } = Dimensions.get('window');
const ORB_SIZE = Math.min(width * 0.6, 240);
const ARC_R = ORB_SIZE / 2 - 2;
const ARC_CIRC = 2 * Math.PI * ARC_R;

// ── Phase-aware breath timing ──────────────────────────────────────────────────
const PHASE_TIMING = {
  dawn:      { inhale: 4000, holdIn: 2000, exhale: 5000, holdOut: 1500 },
  day:       { inhale: 4000, holdIn: 1500, exhale: 5000, holdOut: 1000 },
  goldenHour:{ inhale: 4500, holdIn: 3000, exhale: 6000, holdOut: 2000 },
  night:     { inhale: 5000, holdIn: 2000, exhale: 7000, holdOut: 2500 },
} as const;

// ── Breath phase labels ────────────────────────────────────────────────────────
const LABELS = {
  ready:     { main: 'breathe with me',  sub: '' },
  inhale:    { main: 'inhale',           sub: 'draw it in' },
  holdIn:    { main: 'hold',             sub: 'let it settle' },
  exhale:    { main: 'exhale',           sub: 'let it go' },
  holdOut:   { main: 'rest',             sub: 'empty' },
  done:      { main: 'you did well',     sub: 'carry it with you' },
} as const;

interface Props {
  onDismiss?: () => void;
  onClose?: () => void;
  visible?: boolean;
  theme?: any;
}

export function BreathingExercise({ onDismiss, onClose }: Props) {
  const { theme } = useAnimatedTheme();
  const { phase } = useCircadian();
  const { restlessnessScore } = useOrchidSway(); // passive read
  const { biometrics } = useResponsiveHeart(phase);

  // ── Animated values ──────────────────────────────────────────────────────────
  const coreScale   = useRef(new Animated.Value(0.85)).current;
  const coreOpacity = useRef(new Animated.Value(0.4)).current;
  const r1Scale     = useRef(new Animated.Value(0.9)).current;
  const r1Opacity   = useRef(new Animated.Value(0.22)).current;
  const r2Scale     = useRef(new Animated.Value(0.88)).current;
  const r2Opacity   = useRef(new Animated.Value(0.13)).current;
  const r3Scale     = useRef(new Animated.Value(0.86)).current;
  const r3Opacity   = useRef(new Animated.Value(0.07)).current;
  const arcProgress = useRef(new Animated.Value(0)).current; // 0=empty 1=full
  const labelOpacity= useRef(new Animated.Value(0)).current;
  const dismissOpacity = useRef(new Animated.Value(0)).current;

  // ── State refs (no re-render triggers) ──────────────────────────────────────
  const mainLabel   = useRef('breathe with me');
  const subLabel    = useRef('');
  const cycleCount  = useRef(0);
  const isMounted   = useRef(true);
  const cycleTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allAnims    = useRef<Animated.CompositeAnimation[]>([]);

  // ── Derive timing (BPM from responsive heart adjusts cycle slightly) ─────────
  function getTiming() {
    const base = PHASE_TIMING[phase] ?? PHASE_TIMING.day;
    // BPM from 45-80 — lower BPM = slower breath, scale by ±15%
    const bpmFactor = (biometrics.bpm - 60) / 60; // -0.25 to +0.33
    const scale = 1 - bpmFactor * 0.15;
    return {
      inhale:  Math.round(base.inhale  * scale),
      holdIn:  base.holdIn,
      exhale:  Math.round(base.exhale  * scale),
      holdOut: base.holdOut,
    };
  }

  // ── Ring amplitude scales with restlessness (calmer = fuller expansion) ──────
  function getAmplitude() {
    // High restlessness → smaller, tighter rings (contained)
    // Low restlessness  → larger, flowing rings
    const base = 1 + 0.15 * (1 - restlessnessScore);
    return {
      core: base + 0.05,
      r1:   base + 0.02,
      r2:   base - 0.02,
      r3:   base - 0.05,
    };
  }

  // ── Label setter (mutates ref, forces text update without state) ─────────────
  const setLabel = useCallback((key: keyof typeof LABELS) => {
    mainLabel.current = LABELS[key].main;
    subLabel.current  = LABELS[key].sub;
    // Force text nodes to update — we use a forceUpdate equivalent
    // via a lightweight Animated opacity flash
    Animated.sequence([
      Animated.timing(labelOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(labelOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [labelOpacity]);

  // ── One complete breath cycle ────────────────────────────────────────────────
  const runCycle = useCallback(() => {
    if (!isMounted.current) return;

    const t   = getTiming();
    const amp = getAmplitude();

    cycleCount.current += 1;

    // Show dismiss after 2 cycles
    if (cycleCount.current === 2) {
      Animated.timing(dismissOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }

    // ── INHALE ─────────────────────────────────────────────────────────────
    setLabel('inhale');

    const inhaleAnim = Animated.parallel([
      Animated.timing(coreScale,   { toValue: amp.core, duration: t.inhale, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(coreOpacity, { toValue: 1.0,      duration: t.inhale, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r1Scale,     { toValue: amp.r1,   duration: t.inhale * 1.05, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r1Opacity,   { toValue: 0.55,     duration: t.inhale * 1.05, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r2Scale,     { toValue: amp.r2,   duration: t.inhale * 1.10, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r2Opacity,   { toValue: 0.35,     duration: t.inhale * 1.10, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r3Scale,     { toValue: amp.r3,   duration: t.inhale * 1.15, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r3Opacity,   { toValue: 0.18,     duration: t.inhale * 1.15, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(arcProgress, { toValue: 1,        duration: t.inhale, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
    ]);

    // ── HOLD IN ────────────────────────────────────────────────────────────
    const holdInAnim = Animated.delay(t.holdIn); // rings stay expanded — no animation

    // ── EXHALE ─────────────────────────────────────────────────────────────
    const exhaleAnim = Animated.parallel([
      Animated.timing(coreScale,   { toValue: 0.85,  duration: t.exhale, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(coreOpacity, { toValue: 0.4,   duration: t.exhale, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r1Scale,     { toValue: 0.9,   duration: t.exhale * 1.05, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r1Opacity,   { toValue: 0.22,  duration: t.exhale * 1.05, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r2Scale,     { toValue: 0.88,  duration: t.exhale * 1.10, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r2Opacity,   { toValue: 0.13,  duration: t.exhale * 1.10, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r3Scale,     { toValue: 0.86,  duration: t.exhale * 1.15, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r3Opacity,   { toValue: 0.07,  duration: t.exhale * 1.15, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(arcProgress, { toValue: 0,     duration: t.exhale, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
    ]);

    // ── HOLD OUT ───────────────────────────────────────────────────────────
    const holdOutAnim = Animated.delay(t.holdOut);

    // ── Sequence with label callbacks ──────────────────────────────────────
    const sequence = Animated.sequence([inhaleAnim, holdInAnim, exhaleAnim, holdOutAnim]);
    allAnims.current.push(sequence);

    // Label changes mid-sequence
    cycleTimer.current = setTimeout(() => setLabel('holdIn'),  t.inhale);
    cycleTimer.current = setTimeout(() => setLabel('exhale'),  t.inhale + t.holdIn);
    cycleTimer.current = setTimeout(() => setLabel('holdOut'), t.inhale + t.holdIn + t.exhale);

    sequence.start(({ finished }) => {
      if (finished && isMounted.current) {
        runCycle(); // loop — no user action required
      }
    });
  }, [phase, biometrics.bpm, restlessnessScore, setLabel]);

  // ── Autostart on mount ───────────────────────────────────────────────────────
  useEffect(() => {
    isMounted.current = true;

    // Brief 1.5s arrival moment before breath begins
    // The user lands on screen and the orb just... starts.
    Animated.timing(labelOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    const startTimer = setTimeout(runCycle, 1500);

    return () => {
      isMounted.current = false;
      clearTimeout(startTimer);
      if (cycleTimer.current) clearTimeout(cycleTimer.current);
      allAnims.current.forEach(a => a.stop());
    };
  }, []); // run once — cycle manages its own loop

  // ── Dismiss ──────────────────────────────────────────────────────────────────
  const handleDismiss = useCallback(() => {
    isMounted.current = false;
    allAnims.current.forEach(a => a.stop());
    setLabel('done');
    Animated.parallel([
      Animated.timing(coreOpacity, { toValue: 0.2, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r1Opacity,   { toValue: 0,   duration: 1000, useNativeDriver: true }),
      Animated.timing(r2Opacity,   { toValue: 0,   duration: 800,  useNativeDriver: true }),
      Animated.timing(r3Opacity,   { toValue: 0,   duration: 600,  useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => { if (onDismiss) onDismiss(); if (onClose) onClose(); }, 1200);
    });
  }, [onDismiss, setLabel]);

  // ── Arc interpolation (native driver can't drive strokeDashoffset, so JS) ────
  const arcDashOffset = arcProgress.interpolate({
    inputRange:  [0, 1],
    outputRange: [ARC_CIRC, 0],
  });

  const accentColor = theme.accent;
  const accentDim   = `rgba(${theme.phaseRgb ?? '127,201,201'}, 0.14)`;

  return (
    <Modal
      visible={visible ?? false}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => { if (onClose) onClose(); if (onDismiss) onDismiss(); }}
    >
    <View style={[styles.root, { backgroundColor: theme.bg }]}>

      {/* ── Orb ─────────────────────────────────────────────────────────── */}
      <View style={[styles.orbWrap, { width: ORB_SIZE, height: ORB_SIZE }]}>

        {/* Arc progress ring */}
        <Svg
          width={ORB_SIZE}
          height={ORB_SIZE}
          style={StyleSheet.absoluteFill}
        >
          <Circle
            cx={ORB_SIZE / 2}
            cy={ORB_SIZE / 2}
            r={ARC_R}
            fill="none"
            stroke={accentColor}
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeDasharray={`${ARC_CIRC}`}
            strokeDashoffset={arcDashOffset as any}
            rotation={-90}
            origin={`${ORB_SIZE / 2}, ${ORB_SIZE / 2}`}
            opacity={0.45}
          />
        </Svg>

        {/* Ring 3 — outermost, slowest, staggered +15% delay */}
        <Animated.View style={[
          styles.ring,
          {
            width: ORB_SIZE - 0,
            height: ORB_SIZE - 0,
            borderRadius: (ORB_SIZE) / 2,
            borderColor: accentColor,
            transform: [{ scale: r3Scale }],
            opacity: r3Opacity,
          }
        ]} />

        {/* Ring 2 — middle, staggered +10% */}
        <Animated.View style={[
          styles.ring,
          {
            width: ORB_SIZE * 0.78,
            height: ORB_SIZE * 0.78,
            borderRadius: (ORB_SIZE * 0.78) / 2,
            borderColor: accentColor,
            transform: [{ scale: r2Scale }],
            opacity: r2Opacity,
          }
        ]} />

        {/* Ring 1 — inner ring */}
        <Animated.View style={[
          styles.ring,
          {
            width: ORB_SIZE * 0.59,
            height: ORB_SIZE * 0.59,
            borderRadius: (ORB_SIZE * 0.59) / 2,
            borderColor: accentColor,
            transform: [{ scale: r1Scale }],
            opacity: r1Opacity,
          }
        ]} />

        {/* Core — the breath itself */}
        <Animated.View style={[
          styles.core,
          {
            width: ORB_SIZE * 0.36,
            height: ORB_SIZE * 0.36,
            borderRadius: (ORB_SIZE * 0.36) / 2,
            backgroundColor: accentDim,
            borderColor: accentColor,
            transform: [{ scale: coreScale }],
            opacity: coreOpacity,
          }
        ]} />

      </View>

      {/* ── Labels — no button, just words ──────────────────────────────── */}
      <Animated.View style={[styles.labelWrap, { opacity: labelOpacity }]}>
        <Text style={[styles.mainLabel, { color: theme.text, fontFamily: 'CourierPrime' }]}>
          {mainLabel.current}
        </Text>
        <Text style={[styles.subLabel, { color: theme.textMuted, fontFamily: 'CourierPrime' }]}>
          {subLabel.current}
        </Text>
      </Animated.View>

      {/* ── Dismiss — only after 2 cycles, no play/pause ────────────────── */}
      <Animated.View style={{ opacity: dismissOpacity }}>
        <TouchableOpacity onPress={handleDismiss} style={styles.dismiss}>
          <Text style={[styles.dismissText, { color: theme.textMuted, fontFamily: 'CourierPrime' }]}>
            i feel it
          </Text>
        </TouchableOpacity>
      </Animated.View>

    </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 64,
  },
  orbWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
  core: {
    borderWidth: 1,
  },
  labelWrap: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 48,
  },
  mainLabel: {
    fontSize: 20,
    letterSpacing: 1,
    textTransform: 'lowercase',
    textAlign: 'center',
  },
  subLabel: {
    fontSize: 12,
    letterSpacing: 2.5,
    textTransform: 'lowercase',
    textAlign: 'center',
    opacity: 0.7,
  },
  dismiss: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  dismissText: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'lowercase',
    opacity: 0.5,
  },
});
