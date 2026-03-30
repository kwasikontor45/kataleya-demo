import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const SENSES = [
  {
    count: 5,
    sense: 'see',
    glyph: '◉',
    color: '#7fc9c9',
    instruction: 'look around slowly.\nname five things you can see.',
    examples: ['a door', 'your hands', 'a light', 'a shadow', 'the floor'],
  },
  {
    count: 4,
    sense: 'touch',
    glyph: '◈',
    color: '#9b6dff',
    instruction: 'notice what is in contact with your body.\nname four things you can feel.',
    examples: ['your breath', 'fabric', 'warmth', 'your weight'],
  },
  {
    count: 3,
    sense: 'hear',
    glyph: '◎',
    color: '#e8c56a',
    instruction: 'go quiet inside.\nname three sounds you can hear.',
    examples: ['distant traffic', 'your breathing', 'silence'],
  },
  {
    count: 2,
    sense: 'smell',
    glyph: '◌',
    color: '#7fc9c9',
    instruction: 'breathe slowly.\nname two things you can smell.',
    examples: ['air', 'something nearby'],
  },
  {
    count: 1,
    sense: 'taste',
    glyph: '◍',
    color: '#d0607a',
    instruction: 'bring your attention inside your mouth.\nname one thing you can taste.',
    examples: ['nothing — and that is fine'],
  },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  theme: any;
}

export function GroundingExercise({ visible, onClose, theme }: Props) {
  const insets = useSafeAreaInsets();
  const [senseIdx, setSenseIdx] = useState(0);
  const [found, setFound] = useState(0);
  const [done, setDone] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));

  const current = SENSES[senseIdx];

  useEffect(() => {
    if (!visible) {
      setSenseIdx(0);
      setFound(0);
      setDone(false);
      fadeAnim.setValue(1);
    }
  }, [visible]);

  const crossFade = (fn: () => void) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
      fn();
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    });
  };

  const handleFound = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newFound = found + 1;
    if (newFound >= current.count) {
      if (senseIdx >= SENSES.length - 1) {
        crossFade(() => { setFound(newFound); setDone(true); });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        crossFade(() => { setSenseIdx(s => s + 1); setFound(0); });
      }
    } else {
      setFound(newFound);
    }
  };

  const topPad = Platform.OS === 'web' ? 60 : insets.top + 16;
  const botPad = Platform.OS === 'web' ? 32 : insets.bottom + 24;

  const totalItems = SENSES.reduce((a, s) => a + s.count, 0);
  const completedItems = SENSES.slice(0, senseIdx).reduce((a, s) => a + s.count, 0) + found;
  const overallProgress = completedItems / totalItems;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent>
      <View style={[styles.overlay, { backgroundColor: '#09080f', paddingTop: topPad, paddingBottom: botPad }]}>

        <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={12}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <Text style={styles.title}>5 — 4 — 3 — 2 — 1</Text>
          <Text style={styles.subtitle}>grounding</Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${overallProgress * 100}%`, backgroundColor: current.color }]} />
        </View>

        <Animated.View style={[styles.senseArea, { opacity: fadeAnim }]}>
          <Text style={[styles.bigGlyph, { color: current.color }]}>{current.glyph}</Text>

          <View style={styles.countBadge}>
            <Text style={[styles.countNum, { color: current.color }]}>{current.count - found}</Text>
            <Text style={[styles.countLabel, { color: current.color + '88' }]}>to find</Text>
          </View>

          <Text style={[styles.senseWord, { color: current.color }]}>{current.sense}</Text>
          <Text style={styles.instruction}>{current.instruction}</Text>

          <View style={styles.dotsRow}>
            {Array.from({ length: current.count }).map((_, i) => (
              <View key={i} style={[styles.dot, {
                backgroundColor: i < found ? current.color : current.color + '28',
                shadowColor: i < found ? current.color : 'transparent',
              }]} />
            ))}
          </View>

          {current.examples.slice(0, 1).map((ex, i) => (
            <Text key={i} style={styles.example}>e.g. "{ex}"</Text>
          ))}
        </Animated.View>

        <TouchableOpacity
          onPress={handleFound}
          style={[styles.foundBtn, { borderColor: current.color, backgroundColor: current.color + '18' }]}
          activeOpacity={0.75}
        >
          <Text style={[styles.foundBtnText, { color: current.color }]}>
            {found >= current.count - 1 && senseIdx < SENSES.length - 1
              ? 'next sense →'
              : found >= current.count - 1
              ? 'complete ✦'
              : 'found one ✓'}
          </Text>
        </TouchableOpacity>

        <View style={styles.senseTrail}>
          {SENSES.map((s, i) => (
            <View key={i} style={[styles.trailDot, {
              backgroundColor: i < senseIdx ? '#ffffff44' : i === senseIdx ? current.color : '#ffffff14',
              width: i === senseIdx ? 20 : 6,
            }]} />
          ))}
        </View>

        {done && (
          <View style={styles.completionOverlay}>
            <Text style={styles.completionGlyph}>⟡</Text>
            <Text style={styles.completionTitle}>grounded</Text>
            <Text style={styles.completionSub}>
              you are here.{'\n'}you are safe.{'\n'}you made it through.
            </Text>
            <TouchableOpacity onPress={onClose} style={[styles.completionBtn, { borderColor: '#7fc9c9' }]}>
              <Text style={[styles.completionBtnText, { color: '#7fc9c9' }]}>return to sanctuary</Text>
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
  headerRow: { alignItems: 'center', gap: 2 },
  title: { fontFamily: 'CourierPrime', fontSize: 18, color: '#ffffff', letterSpacing: 4, fontWeight: '700', textAlign: 'center' },
  subtitle: { fontFamily: 'CourierPrime', fontSize: 11, color: '#ffffff44', letterSpacing: 4, textTransform: 'uppercase' },
  progressTrack: { width: '100%', height: 2, borderRadius: 1, backgroundColor: '#ffffff14', overflow: 'hidden' },
  progressFill: { height: 2, borderRadius: 1 },
  senseArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, width: '100%' },
  bigGlyph: { fontSize: 64, lineHeight: 72 },
  countBadge: { alignItems: 'center', gap: 2 },
  countNum: { fontFamily: 'CourierPrime', fontSize: 56, fontWeight: '700', lineHeight: 60, letterSpacing: -1 },
  countLabel: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' },
  senseWord: { fontFamily: 'CourierPrime', fontSize: 28, fontWeight: '700', letterSpacing: 6, textTransform: 'uppercase' },
  instruction: { fontFamily: 'CourierPrime', fontSize: 13, color: '#ffffff66', letterSpacing: 0.3, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  dotsRow: { flexDirection: 'row', gap: 10, marginVertical: 4 },
  dot: {
    width: 12, height: 12, borderRadius: 6,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6, elevation: 4,
  },
  example: { fontFamily: 'CourierPrime', fontSize: 11, color: '#ffffff33', letterSpacing: 0.5, fontStyle: 'italic' },
  foundBtn: { width: '100%', borderWidth: 1, borderRadius: 10, paddingVertical: 18, alignItems: 'center' },
  foundBtnText: { fontFamily: 'CourierPrime', fontSize: 14, letterSpacing: 2 },
  senseTrail: { flexDirection: 'row', gap: 6, alignItems: 'center', height: 20 },
  trailDot: { height: 6, borderRadius: 3, backgroundColor: '#ffffff22' },
  completionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#09080fee',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    paddingHorizontal: 32,
  },
  completionGlyph: { fontSize: 52, color: '#7fc9c9' },
  completionTitle: { fontFamily: 'CourierPrime', fontSize: 32, color: '#ffffff', letterSpacing: 6, fontWeight: '700' },
  completionSub: { fontFamily: 'CourierPrime', fontSize: 15, color: '#ffffff66', letterSpacing: 0.5, textAlign: 'center', lineHeight: 26 },
  completionBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 16, paddingHorizontal: 36, marginTop: 10 },
  completionBtnText: { fontFamily: 'CourierPrime', fontSize: 13, letterSpacing: 2 },
});
