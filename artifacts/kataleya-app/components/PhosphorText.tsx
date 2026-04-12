// components/PhosphorText.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Phosphor text with CRT warm-up fade and optional typewriter mode.
// Typewriter variant shows a phosphor decay trail — previous characters dim
// behind the cursor as the tube loses energy.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { Text, View, StyleSheet, TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { PHOSPHOR } from '@/constants/phosphor-noir';

interface PhosphorTextProps {
  text: string;
  style?: TextStyle;
  delay?: number;
  typewriter?: boolean;
  color?: 'green' | 'amber';
  onComplete?: () => void;
}

// ── Static phosphor line — warm-up fade + initial glow burst ─────────────────
export function PhosphorText({
  text,
  style,
  delay = 0,
  typewriter = false,
  color = 'green',
  onComplete,
}: PhosphorTextProps) {
  const textColor = color === 'green' ? PHOSPHOR.green : PHOSPHOR.amber;
  const opacity   = useSharedValue(0);
  const glowSize  = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 120 }));
    glowSize.value = withDelay(
      delay,
      withSequence(
        withTiming(8, { duration: 80 }),
        withTiming(2, { duration: 600 }),
      ),
    );
  }, [text]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    textShadowRadius: glowSize.value,
  }));

  if (typewriter) {
    return (
      <TypewriterPhosphor
        text={text}
        color={textColor}
        style={style}
        delay={delay}
        onComplete={onComplete}
      />
    );
  }

  return (
    <Animated.Text
      style={[
        styles.base,
        { color: textColor, textShadowColor: textColor },
        style,
        animatedStyle,
      ]}
    >
      {text}
    </Animated.Text>
  );
}

// ── Typewriter with phosphor decay trail ─────────────────────────────────────
function TypewriterPhosphor({
  text,
  color,
  style,
  delay = 0,
  onComplete,
}: {
  text: string;
  color: string;
  style?: TextStyle;
  delay?: number;
  onComplete?: () => void;
}) {
  const [chars, setChars] = useState<string[]>([]);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setChars([]);
    indexRef.current = 0;

    const tick = () => {
      const i = indexRef.current;
      if (i >= text.length) {
        onComplete?.();
        return;
      }
      setChars(prev => [...prev, text[i]]);
      indexRef.current = i + 1;

      // punctuation pauses
      const ch = text[i];
      const extra = ch === '.' ? 160 : ch === ',' ? 80 : ch === ':' ? 100 : 0;
      timerRef.current = setTimeout(tick, PHOSPHOR.typeMs + extra);
    };

    timerRef.current = setTimeout(tick, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [text, delay]);

  // Build decay trail — most recent char is brightest
  const full = chars.join('');

  return (
    <View style={styles.typewriterWrap}>
      {/* Decay ghost — full string at dim opacity */}
      {chars.length > 1 && (
        <Text
          style={[
            styles.base,
            { color, opacity: 0.25, position: 'absolute', textShadowColor: color, textShadowRadius: 0 },
            style,
          ]}
        >
          {full}
        </Text>
      )}
      {/* Live string — full brightness */}
      <Text
        style={[
          styles.base,
          { color, textShadowColor: color, textShadowRadius: 3 },
          style,
        ]}
      >
        {full}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: 'CourierPrime',
    fontSize: 14,
    letterSpacing: 0.5,
    textShadowOffset: { width: 0, height: 0 },
  },
  typewriterWrap: {
    position: 'relative',
  },
});
