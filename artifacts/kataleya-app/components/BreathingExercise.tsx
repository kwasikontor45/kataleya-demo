'use no memo';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const { width: SW } = Dimensions.get('window');
const ORB_SIZE = Math.min(SW * 0.54, 220);
const RING1 = ORB_SIZE + 28;
const RING2 = ORB_SIZE + 58;

const PHASES = [
  { label: 'Inhale',  instruction: 'breathe in slowly through your nose',  duration: 4,  color: '#7fc9c9', scale: 1.38 },
  { label: 'Hold',    instruction: 'hold gently, stay still',               duration: 7,  color: '#9b6dff', scale: 1.38 },
  { label: 'Exhale',  instruction: 'release slowly through your mouth',     duration: 8,  color: '#d0607a', scale: 0.88 },
];
const TOTAL_CYCLES = 3;

interface Props {
  visible: boolean;
  onClose: () => void;
  theme: any;
}

export function BreathingExercise({ visible, onClose, theme }: Props) {
  const insets = useSafeAreaInsets();
  const [running, setRunning] = useState(true);  // auto-start on mount
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [countdown, setCountdown] = useState(PHASES[0].duration);
  const [cycles, setCycles] = useState(0);
  const [done, setDone] = useState(false);

  const scaleAnim  = useRef(new Animated.Value(1.0)).current;
  const glowAnim   = useRef(new Animated.Value(0.3)).current;
  // Staggered ring anims — each ring breathes independently
  const ring1Scale = useRef(new Animated.Value(1.0)).current;
  const ring2Scale = useRef(new Animated.Value(1.0)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const phase = PHASES[phaseIdx];

  const animateToPhase = useCallback((idx: number) => {
    const p = PHASES[idx];
    // Ring 1 follows with 180ms delay, ring 2 with 360ms — staggered breathing
    setTimeout(() => {
      Animated.timing(ring1Scale, {
        toValue: p.scale * 1.06,
        duration: 1100,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }).start();
    }, 180);
    setTimeout(() => {
      Animated.timing(ring2Scale, {
        toValue: p.scale * 1.12,
        duration: 1300,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }).start();
    }, 360);
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: p.scale,
        duration: 900,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: p.label === 'Exhale' ? 0.18 : 0.55,
        duration: 900,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, glowAnim]);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
    setPhaseIdx(0);
    setCountdown(PHASES[0].duration);
    setCycles(0);
    setDone(false);
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      Animated.timing(glowAnim,  { toValue: 0.3, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, glowAnim]);

  useEffect(() => {
    if (!visible) { reset(); }
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
                setRunning(false);
                setDone(true);
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
      Animated.timing(scaleAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }).start();
    }
  };

  const topPad = Platform.OS === 'web' ? 60 : insets.top + 16;
  const botPad = Platform.OS === 'web' ? 32 : insets.bottom + 16;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent>
      <View style={[styles.overlay, { backgroundColor: '#09080f', paddingTop: topPad, paddingBottom: botPad }]}>

        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <Text style={styles.title}>4 — 7 — 8</Text>
        <Text style={styles.subtitle}>breathing</Text>

        <View style={styles.orbArea}>
          {/* Outer ring 2 */}
          <Animated.View style={[styles.ring, {
            width: RING2, height: RING2, borderRadius: RING2 / 2,
            borderColor: phase.color + '22',
            opacity: glowAnim,
            transform: [{ scale: ring2Scale }],
          }]} />
          {/* Outer ring 1 */}
          <Animated.View style={[styles.ring, {
            width: RING1, height: RING1, borderRadius: RING1 / 2,
            borderColor: phase.color + '44',
            opacity: glowAnim,
            transform: [{ scale: ring1Scale }],
          }]} />
          {/* Main orb */}
          <Animated.View style={[styles.orb, {
            width: ORB_SIZE, height: ORB_SIZE, borderRadius: ORB_SIZE / 2,
            backgroundColor: phase.color + 'bb',
            shadowColor: phase.color,
            transform: [{ scale: scaleAnim }],
          }]}>
            <Text style={styles.orbCount}>{countdown}</Text>
          </Animated.View>
        </View>

        <Text style={[styles.phaseLabel, { color: phase.color }]}>{phase.label}</Text>
        <Text style={styles.phaseInstruction}>{phase.instruction}</Text>

        <View style={styles.cycleRow}>
          {Array.from({ length: TOTAL_CYCLES }).map((_, i) => (
            <View key={i} style={[styles.cycleDot, {
              backgroundColor: i < cycles ? phase.color : phase.color + '33',
            }]} />
          ))}
        </View>

        <View style={styles.controls}>
          <TouchableOpacity onPress={reset} style={styles.controlBtn} hitSlop={12}>
            <Text style={styles.controlIcon}>↺</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={togglePlay} style={[styles.playBtn, { backgroundColor: phase.color }]}>
            <Text style={styles.playIcon}>{running ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
        </View>

        {done && (
          <View style={styles.completionOverlay}>
            <Text style={styles.completionGlyph}>✦</Text>
            <Text style={styles.completionTitle}>well done</Text>
            <Text style={styles.completionSub}>your nervous system thanks you.</Text>
            <TouchableOpacity onPress={onClose} style={[styles.completionBtn, { borderColor: '#7fc9c9' }]}>
              <Text style={[styles.completionBtnText, { color: '#7fc9c9' }]}>continue</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  closeBtn: { alignSelf: 'flex-end', padding: 4 },
  closeText: { color: '#ffffff44', fontFamily: 'CourierPrime', fontSize: 18 },
  title: { fontFamily: 'CourierPrime', fontSize: 22, color: '#ffffff', letterSpacing: 6, fontWeight: '700' },
  subtitle: { fontFamily: 'CourierPrime', fontSize: 11, color: '#ffffff44', letterSpacing: 4, textTransform: 'uppercase', marginTop: -2 },
  orbArea: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
  orb: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 30,
    elevation: 20,
  },
  orbCount: { fontFamily: 'CourierPrime', fontSize: 52, color: '#ffffff', fontWeight: '700' },
  phaseLabel: { fontFamily: 'CourierPrime', fontSize: 26, fontWeight: '700', letterSpacing: 3 },
  phaseInstruction: { fontFamily: 'CourierPrime', fontSize: 12, color: '#ffffff66', letterSpacing: 0.5, textAlign: 'center', maxWidth: 260 },
  cycleRow: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  cycleDot: { width: 8, height: 8, borderRadius: 4 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 8 },
  controlBtn: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 23, backgroundColor: '#ffffff14' },
  controlIcon: { color: '#ffffff99', fontSize: 20, fontFamily: 'CourierPrime' },
  playBtn: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center' },
  playIcon: { fontSize: 22, color: '#ffffff' },
  completionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#09080fee',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  completionGlyph: { fontSize: 40, color: '#7fc9c9' },
  completionTitle: { fontFamily: 'CourierPrime', fontSize: 28, color: '#ffffff', letterSpacing: 4, fontWeight: '700' },
  completionSub: { fontFamily: 'CourierPrime', fontSize: 13, color: '#ffffff66', letterSpacing: 0.5 },
  completionBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 40, marginTop: 8 },
  completionBtnText: { fontFamily: 'CourierPrime', fontSize: 13, letterSpacing: 2 },
  completionAgain: { fontFamily: 'CourierPrime', fontSize: 11, color: '#ffffff33', letterSpacing: 2, marginTop: 4 },
});
