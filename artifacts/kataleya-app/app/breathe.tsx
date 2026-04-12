// app/breathe.tsx — standalone 4-7-8 screen, reachable from terminal
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BreathingExercise } from '@/components/BreathingExercise';
import { useCircadian } from '@/hooks/useCircadian';
import { NEON_RGB } from '@/components/NeonCard';

export default function BreatheScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { theme } = useCircadian();

  const accentRgb = theme.phase === 'goldenHour' ? NEON_RGB.amber
                  : theme.phase === 'night'       ? NEON_RGB.violet
                  : NEON_RGB.cyan;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
      <TouchableOpacity
        onPress={() => router.back()}
        hitSlop={16}
        style={[styles.back, { top: insets.top + 12 }]}
      >
        <Text style={[styles.backText, { color: `rgba(${accentRgb}, 0.4)` }]}>← back</Text>
      </TouchableOpacity>
      <BreathingExercise visible={true} onClose={() => router.back()} onDismiss={() => router.back()} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050508',
  },
  back: {
    position: 'absolute',
    left: 24,
    zIndex: 10,
  },
  backText: {
    fontFamily: 'CourierPrime',
    fontSize: 12,
    letterSpacing: 1.5,
  },
});
