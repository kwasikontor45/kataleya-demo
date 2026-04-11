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

// ── 4-7-8 breath timing — true to the technique ──────────────────────────────
// Inhale 4 counts, hold 7 counts, exhale 8 counts.
// One "count" = 1000ms base. Night slows slightly for deeper calm.
const COUNT_MS = {
  dawn:       1000,
  day:        1000,
  goldenHour: 1100,
  night:      1200,
} as const;

function getPhaseTiming(phase: string) {
  const ms = COUNT_MS[phase as keyof typeof COUNT_MS] ?? 1000;
  return {
    inhale:  4 * ms,   // 4 counts
    holdIn:  7 * ms,   // 7 counts
    exhale:  8 * ms,   // 8 counts
    holdOut: 0,        // no hold out — 4-7-8 goes straight back to inhale
    counts:  { inhale: 4, holdIn: 7, exhale: 8 },
    ms,
  };
}

// ── Breath phase labels ────────────────────────────────────────────────────────
const LABELS = {
  ready:     { main: 'breathe with me',  sub: '' },
  inhale:    { main: 'inhale',           sub: 'draw it in' },
  holdIn:    { main: 'hold',             sub: 'let it settle' },
  exhale:    { main: 'exhale',           sub: 'let it go' },
  holdOut:   { main: 'rest',             sub: 'empty' },
  done:      { main: 'take it with you', sub: 'tap anywhere to close' },
} as const;

interface Props {
  onDismiss?: () => void;
  onClose?: () => void;
  visible?: boolean;
  theme?: any;
}

export function BreathingExercise({ onDismiss, onClose, visible }: Props) {
  const { theme } = useAnimatedTheme();
  const { phase } = useCircadian();
  const { restlessnessScore } = useOrchidSway(); // passive read
  const { biometrics } = useResponsiveHeart(phase);

  // ── Animated values ──────────────────────────────────────────────────────────
  const coreScale      = useRef(new Animated.Value(0.7)).current;
  const coreOpacity    = useRef(new Animated.Value(0.3)).current;
  const coreGlow       = useRef(new Animated.Value(0)).current;
  const r1Scale        = useRef(new Animated.Value(0.9)).current;
  const r1Opacity      = useRef(new Animated.Value(0.15)).current;
  const r2Scale        = useRef(new Animated.Value(0.88)).current;
  const r2Opacity      = useRef(new Animated.Value(0.08)).current;
  const r3Scale        = useRef(new Animated.Value(0.86)).current;
  const r3Opacity      = useRef(new Animated.Value(0.04)).current;
  const arcProgress    = useRef(new Animated.Value(0)).current;
  const bgBrightness   = useRef(new Animated.Value(0)).current; // 0=dark 1=lighter
  const labelOpacity   = useRef(new Animated.Value(0)).current;
  const countOpacity   = useRef(new Animated.Value(0)).current;
  const dismissOpacity = useRef(new Animated.Value(0)).current;

  // ── State refs (no re-render triggers) ──────────────────────────────────────
  const mainLabel   = useRef('breathe with me');
  const subLabel    = useRef('');
  const countLabel  = useRef('');
  const cycleCount  = useRef(0);
  const isMounted   = useRef(true);
  const cycleTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const allAnims    = useRef<Animated.CompositeAnimation[]>([]);
  const hasStarted  = useRef(false);
  const isDone      = useRef(false);

  // ── Derive timing — pure 4-7-8 ───────────────────────────────────────────────
  function getTiming() {
    return getPhaseTiming(phase);
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

  // ── Countdown ticker ─────────────────────────────────────────────────────────
  const startCountdown = useCallback((from: number, ms: number) => {
    if (countTimer.current) clearTimeout(countTimer.current);
    countLabel.current = String(from);
    Animated.sequence([
      Animated.timing(countOpacity, { toValue: 0, duration: 80, useNativeDriver: true }),
      Animated.timing(countOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    let remaining = from - 1;
    const tick = () => {
      if (!isMounted.current || remaining <= 0) return;
      countLabel.current = String(remaining);
      Animated.sequence([
        Animated.timing(countOpacity, { toValue: 0, duration: 80, useNativeDriver: true }),
        Animated.timing(countOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      remaining--;
      countTimer.current = setTimeout(tick, ms);
    };
    countTimer.current = setTimeout(tick, ms);
  }, [countOpacity]);

  // ── One complete 4-7-8 breath cycle ──────────────────────────────────────────
  const runCycle = useCallback(() => {
    if (!isMounted.current) return;

    const t   = getTiming();
    const amp = getAmplitude();

    cycleCount.current += 1;

    if (cycleCount.current === 2) {
      Animated.timing(dismissOpacity, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    }

    // ── INHALE — 4 counts, orb blooms, bg lightens ─────────────────────────
    setLabel('inhale');
    startCountdown(t.counts.inhale, t.ms);

    const inhaleAnim = Animated.parallel([
      Animated.timing(coreScale,    { toValue: amp.core, duration: t.inhale, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(coreOpacity,  { toValue: 0.85,     duration: t.inhale, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(coreGlow,     { toValue: 1,        duration: t.inhale, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r1Scale,      { toValue: amp.r1,   duration: t.inhale * 1.05, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r1Opacity,    { toValue: 0.6,      duration: t.inhale * 1.05, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r2Scale,      { toValue: amp.r2,   duration: t.inhale * 1.10, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r2Opacity,    { toValue: 0.38,     duration: t.inhale * 1.10, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r3Scale,      { toValue: amp.r3,   duration: t.inhale * 1.15, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r3Opacity,    { toValue: 0.2,      duration: t.inhale * 1.15, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(arcProgress,  { toValue: 1,        duration: t.inhale, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      Animated.timing(bgBrightness, { toValue: 1,        duration: t.inhale, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
    ]);

    // ── HOLD IN — 7 counts, orb stays full ────────────────────────────────
    const holdInAnim = Animated.delay(t.holdIn);

    // ── EXHALE — 8 counts, orb dims, bg darkens ───────────────────────────
    const exhaleAnim = Animated.parallel([
      Animated.timing(coreScale,    { toValue: 0.7,   duration: t.exhale, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(coreOpacity,  { toValue: 0.3,   duration: t.exhale, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(coreGlow,     { toValue: 0,     duration: t.exhale, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r1Scale,      { toValue: 0.9,   duration: t.exhale * 1.05, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r1Opacity,    { toValue: 0.15,  duration: t.exhale * 1.05, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r2Scale,      { toValue: 0.88,  duration: t.exhale * 1.10, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r2Opacity,    { toValue: 0.08,  duration: t.exhale * 1.10, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r3Scale,      { toValue: 0.86,  duration: t.exhale * 1.15, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(r3Opacity,    { toValue: 0.04,  duration: t.exhale * 1.15, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(arcProgress,  { toValue: 0,     duration: t.exhale, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      Animated.timing(bgBrightness, { toValue: 0,     duration: t.exhale, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
    ]);

    const sequence = Animated.sequence([inhaleAnim, holdInAnim, exhaleAnim]);
    allAnims.current.push(sequence);

    // Label + countdown changes mid-sequence
    cycleTimer.current = setTimeout(() => {
      setLabel('holdIn');
      startCountdown(t.counts.holdIn, t.ms);
    }, t.inhale);

    cycleTimer.current = setTimeout(() => {
      setLabel('exhale');
      startCountdown(t.counts.exhale, t.ms);
    }, t.inhale + t.holdIn);

    sequence.start(({ finished }) => {
      if (finished && isMounted.current) runCycle();
    });
  }, [phase, restlessnessScore, setLabel, startCountdown]);

  // ── Reset + autostart when modal opens ──────────────────────────────────────
  useEffect(() => {
    if (!visible) {
      // Clean up when closing
      isMounted.current = false;
      if (cycleTimer.current) clearTimeout(cycleTimer.current);
      if (countTimer.current) clearTimeout(countTimer.current);
      allAnims.current.forEach(a => a.stop());
      allAnims.current = [];
      return;
    }

    // Reset all state for fresh open
    isMounted.current = true;
    cycleCount.current = 0;
    countLabel.current = '';
    mainLabel.current = 'breathe with me';
    subLabel.current = '';

    // Reset all animated values
    coreScale.setValue(0.7);
    coreOpacity.setValue(0.3);
    coreGlow.setValue(0);
    r1Scale.setValue(0.9);
    r1Opacity.setValue(0.15);
    r2Scale.setValue(0.88);
    r2Opacity.setValue(0.08);
    r3Scale.setValue(0.86);
    r3Opacity.setValue(0.04);
    arcProgress.setValue(0);
    bgBrightness.setValue(0);
    labelOpacity.setValue(0);
    countOpacity.setValue(0);
    dismissOpacity.setValue(0);

    hasStarted.current = false;
    isDone.current = false;
    Animated.timing(labelOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    const startTimer = setTimeout(() => {}, 0); // no autostart — user taps to begin

    return () => {
      isMounted.current = false;
      clearTimeout(startTimer);
      if (cycleTimer.current) clearTimeout(cycleTimer.current);
      if (countTimer.current) clearTimeout(countTimer.current);
      allAnims.current.forEach(a => a.stop());
      allAnims.current = [];
    };
  }, [visible]);

  // ── Dismiss ──────────────────────────────────────────────────────────────────
  // Called when user taps "i feel it" mid-session
  const handleDismiss = useCallback(() => {
    if (isDone.current) return; // already done — tap closes
    isMounted.current = false;
    allAnims.current.forEach(a => a.stop());
    if (countTimer.current) clearTimeout(countTimer.current);
    if (cycleTimer.current) clearTimeout(cycleTimer.current);
    countLabel.current = '';
    isDone.current = true;
    setLabel('done');
    // Stop rings, show "take it with you" — wait for tap to close
    Animated.parallel([
      Animated.timing(coreOpacity,  { toValue: 0.2, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(coreGlow,     { toValue: 0,   duration: 1000, useNativeDriver: true }),
      Animated.timing(r1Opacity,    { toValue: 0,   duration: 1000, useNativeDriver: true }),
      Animated.timing(r2Opacity,    { toValue: 0,   duration: 800,  useNativeDriver: true }),
      Animated.timing(r3Opacity,    { toValue: 0,   duration: 600,  useNativeDriver: true }),
      Animated.timing(countOpacity, { toValue: 0,   duration: 300,  useNativeDriver: true }),
    ]).start();
    Animated.timing(dismissOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [setLabel, countOpacity]);

  // Called when user taps anywhere after done state
  const handleFinalClose = useCallback(() => {
    if (!isDone.current) return;
    Animated.parallel([
      Animated.timing(coreOpacity,  { toValue: 0, duration: 800, useNativeDriver: true }),
      Animated.timing(labelOpacity, { toValue: 0, duration: 800, useNativeDriver: true }),
      Animated.timing(dismissOpacity, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start(() => {
      if (onDismiss) onDismiss();
      if (onClose) onClose();
    });
  }, [onDismiss, onClose, labelOpacity]);

  // Called when user taps orb to begin
  const handleBegin = useCallback(() => {
    if (hasStarted.current || isDone.current) return;
    hasStarted.current = true;
    runCycle();
  }, [runCycle]);

  // ── Arc interpolation (native driver can't drive strokeDashoffset, so JS) ────
  const arcDashOffset = arcProgress.interpolate({
    inputRange:  [0, 1],
    outputRange: [ARC_CIRC, 0],
  });

  const accentColor = theme.accent;
  const phaseRgb    = theme.phaseRgb ?? '127,201,201';
  const accentDim   = `rgba(${phaseRgb}, 0.14)`;

  // Background breathes subtly with the inhale
  const bgColor = bgBrightness.interpolate({
    inputRange:  [0, 1],
    outputRange: [`rgba(${phaseRgb}, 0.00)`, `rgba(${phaseRgb}, 0.06)`],
  });

  // Core glow color interpolation
  const glowColor = coreGlow.interpolate({
    inputRange:  [0, 1],
    outputRange: [`rgba(${phaseRgb}, 0.1)`, `rgba(${phaseRgb}, 0.55)`],
  });

  return (
    <Modal
      visible={visible ?? false}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => { if (onClose) onClose(); if (onDismiss) onDismiss(); }}
    >
    <TouchableOpacity
      style={[styles.root, { backgroundColor: theme.bg }]}
      activeOpacity={1}
      onPress={isDone.current ? handleFinalClose : undefined}
    >

      {/* ── Breathing background glow ─────────────────────────────────── */}
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: bgColor }]} pointerEvents="none" />

      {/* ── Close button — always visible ────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => { if (onClose) onClose(); if (onDismiss) onDismiss(); }}
        style={styles.closeBtn}
        hitSlop={16}
      >
        <Text style={[styles.closeBtnText, { color: `rgba(${phaseRgb},0.35)` }]}>✕</Text>
      </TouchableOpacity>

      {/* ── 4 · 7 · 8 label ─────────────────────────────────────────────── */}
      <Text style={[styles.techniqueLabel, { color: `rgba(${phaseRgb}, 0.25)` }]}>
        4 · 7 · 8
      </Text>

      {/* ── Tap to begin — only before start ── */}
      {!hasStarted.current && !isDone.current && (
        <TouchableOpacity onPress={handleBegin} hitSlop={24} style={styles.beginHint}>
          <Text style={[styles.beginHintText, { color: `rgba(${phaseRgb}, 0.35)` }]}>
            tap the orb to begin
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Tap to begin — only before start ── */}
      {!hasStarted.current && !isDone.current && (
        <TouchableOpacity onPress={handleBegin} hitSlop={24} style={styles.beginHint}>
          <Text style={[styles.beginHintText, { color: `rgba(${phaseRgb}, 0.35)` }]}>
            tap the orb to begin
          </Text>
        </TouchableOpacity>
      )}

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

        {/* Core glow layer — blooms on inhale */}
        <Animated.View style={[
          styles.coreGlow,
          {
            width: ORB_SIZE * 0.70,
            height: ORB_SIZE * 0.70,
            borderRadius: (ORB_SIZE * 0.70) / 2,
            backgroundColor: glowColor,
            transform: [{ scale: coreScale }],
          }
        ]} />

        {/* Core — the breath itself, tap to begin */}
        <TouchableOpacity
          onPress={handleBegin}
          activeOpacity={0.85}
          style={styles.coreTouch}
        >
          <Animated.View style={[
            styles.core,
            {
              width: ORB_SIZE * 0.52,
              height: ORB_SIZE * 0.52,
              borderRadius: (ORB_SIZE * 0.52) / 2,
              backgroundColor: accentDim,
              borderColor: accentColor,
              borderWidth: 1.5,
              transform: [{ scale: coreScale }],
              opacity: coreOpacity,
            }
          ]}>
            {/* Countdown number inside the core */}
            <Animated.Text style={[styles.countdownText, { color: accentColor, opacity: countOpacity }]}>
              {countLabel.current}
            </Animated.Text>
          </Animated.View>
        </TouchableOpacity>

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

    </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 64,
    paddingTop: 48,
  },
  techniqueLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 4,
    textTransform: 'lowercase',
    marginBottom: 48,
  },
  orbWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
  coreGlow: {
    position: 'absolute',
  },
  core: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    fontFamily: 'CourierPrime',
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 2,
    textAlign: 'center',
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
  coreTouch: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: ORB_SIZE * 0.52,
    height: ORB_SIZE * 0.52,
    borderRadius: (ORB_SIZE * 0.52) / 2,
  },
  coreTouch: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: ORB_SIZE * 0.52,
    height: ORB_SIZE * 0.52,
    borderRadius: (ORB_SIZE * 0.52) / 2,
  },
  coreTouch: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: ORB_SIZE * 0.52,
    height: ORB_SIZE * 0.52,
    borderRadius: (ORB_SIZE * 0.52) / 2,
  },
  beginHint: {
    position: 'absolute',
    bottom: '22%',
    alignSelf: 'center',
  },
  beginHintText: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'lowercase',
  },
  coreTouch: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: ORB_SIZE * 0.52,
    height: ORB_SIZE * 0.52,
    borderRadius: (ORB_SIZE * 0.52) / 2,
  },
  coreTouch: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: ORB_SIZE * 0.52,
    height: ORB_SIZE * 0.52,
    borderRadius: (ORB_SIZE * 0.52) / 2,
  },
  coreTouch: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: ORB_SIZE * 0.52,
    height: ORB_SIZE * 0.52,
    borderRadius: (ORB_SIZE * 0.52) / 2,
  },
  beginHint: {
    position: 'absolute',
    bottom: '22%',
    alignSelf: 'center',
  },
  beginHintText: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'lowercase',
  },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
    padding: 8,
  },
  closeBtnText: {
    fontFamily: 'CourierPrime',
    fontSize: 16,
    letterSpacing: 1,
  },
  dismissPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  dismissPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 28,
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
