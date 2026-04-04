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
  { label: 'Inhale',  duration: 4,  scaleTarget: 1.45 },
  { label: 'Hold',    duration: 7,  scaleTarget: 1.45 },
  { label: 'Exhale',  duration: 8,  scaleTarget: 0.88 },
  { label: 'Hold',    duration: 4,  scaleTarget: 0.88 },
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
        duration: Math.min(p.duration * 350, 2000),
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
