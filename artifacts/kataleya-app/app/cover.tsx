import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Animated, Easing,
} from 'react-native';
import { useRouter } from 'expo-router';

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

const pad = (n: number) => String(n).padStart(2, '0');

// Breathe — slow 5.5s inhale/exhale, calming for crisis moments
function useBreathCycle() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const cycle = () => {
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) cycle(); });
    };
    cycle();
    return () => anim.stopAnimation();
  }, []);
  return anim;
}

export default function CoverScreen() {
  const router    = useRouter();
  const time      = useClock();
  const breathe   = useBreathCycle();
  const tapCount  = useRef(0);
  const tapTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hours   = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const isAM    = hours < 12;
  const h12     = hours % 12 || 12;
  const day     = time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const handleTap = () => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (tapCount.current >= 3) {
      tapCount.current = 0;
      router.back();
      return;
    }
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 800);
  };

  // Breathing ring opacity
  const ringOpacity = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.14] });
  const ringScale   = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] });

  return (
    <View style={styles.container}>
      {/* Ambient breathing ring — barely visible, calming presence */}
      <Animated.View
        pointerEvents="none"
        style={[styles.breathRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
      />

      <TouchableOpacity
        style={styles.clockArea}
        onPress={handleTap}
        activeOpacity={1}
        accessible={false}
      >
        <Text style={styles.dayText}>{day}</Text>

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>
            {pad(h12)}:{pad(minutes)}
          </Text>
          <View style={styles.ampmCol}>
            <Text style={[styles.ampm, { opacity: isAM ? 0.7 : 0.15 }]}>AM</Text>
            <Text style={[styles.ampm, { opacity: !isAM ? 0.7 : 0.15 }]}>PM</Text>
          </View>
        </View>

        <Text style={styles.seconds}>{pad(seconds)}</Text>

        <View style={styles.divider} />

        {/* Breathing instruction — gentle, not clinical */}
        <Text style={styles.label}>breathe</Text>
        <Text style={styles.sublabel}>tap three times to return to the garden</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0c0a',   // near-black warm brown — not pure #000
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: '#87a878',       // sage — sanctuary colour
  },
  clockArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  dayText: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'CourierPrime',
    fontSize: 11,
    color: '#3a3028',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  timeText: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'CourierPrime',
    fontSize: 72,
    color: '#4a4038',             // very dark warm brown — readable, not glaring
    fontWeight: '100',
    letterSpacing: -2,
    lineHeight: 80,
  },
  ampmCol: { paddingTop: 14, gap: 2 },
  ampm: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'CourierPrime',
    fontSize: 11,
    color: '#3a3028',
    letterSpacing: 1,
  },
  seconds: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'CourierPrime',
    fontSize: 18,
    color: '#2a2018',
    letterSpacing: 3,
  },
  divider: {
    width: 32,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#2a2018',
    marginVertical: 8,
  },
  label: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'CourierPrime',
    fontSize: 11,
    color: '#3a3028',
    letterSpacing: 4,
    textTransform: 'lowercase',
  },
  sublabel: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'CourierPrime',
    fontSize: 9,
    color: '#2a2018',
    letterSpacing: 1,
    marginTop: 4,
  },
});
