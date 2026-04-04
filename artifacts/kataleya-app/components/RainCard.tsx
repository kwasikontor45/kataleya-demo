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
