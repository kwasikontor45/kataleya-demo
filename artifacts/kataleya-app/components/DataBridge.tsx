import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useResponsiveHeart } from '@/hooks/useResponsiveHeart';
import Reanimated, { useAnimatedStyle } from 'react-native-reanimated';
import { CircadianPhase } from '@/constants/circadian';
import { ThemeTokens } from '@/constants/theme';

const ANALOG_CHARS = '~!@#$%&*()+-=[]{}|;:,.?░▒▓█▄▀■□●○◆◇';
const BINARY = ['0', '1'];
const WIN = Dimensions.get('window');

const AnimatedText = Reanimated.createAnimatedComponent(Text);

function randomChar(chars: string) {
  return chars[Math.floor(Math.random() * chars.length)];
}

function makeAnalog(len: number, chars: string) {
  return Array.from({ length: len }, () => randomChar(chars)).join('');
}

function makeBinary(len: number) {
  return Array.from({ length: len }, () => BINARY[Math.floor(Math.random() * 2)]).join(' ');
}

interface Props {
  phase: CircadianPhase;
  theme: ThemeTokens;
  size?: 'small' | 'large';
  showBridge?: boolean;
}

const STATE_CYCLES: Record<string, string[]> = {
  holding:     ['holding', 'sampling', 'listening', 'waiting', 'still'],
  present:     ['present', 'encoding', 'sampling', 'reading', 'secure'],
  attuned:     ['attuned', 'syncing', 'encoding', 'aligned', 'resonant'],
  celebrating: ['celebrating', 'transmitting', 'radiant', 'blooming', 'open'],
};

export function DataBridge({ phase, theme, size = 'large', showBridge = false }: Props) {
  const { opacity, scale, letterSpacing, systemState } = useResponsiveHeart(phase);
  const [cycleWord, setCycleWord] = useState(systemState);
  const cycleIndex = useRef(0);

  useEffect(() => {
    const words = STATE_CYCLES[systemState] ?? [systemState];
    cycleIndex.current = 0;
    setCycleWord(words[0]);
    const interval = setInterval(() => {
      cycleIndex.current = (cycleIndex.current + 1) % words.length;
      setCycleWord(words[cycleIndex.current]);
    }, 2200);
    return () => clearInterval(interval);
  }, [systemState]);

  const symbolStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
    letterSpacing: letterSpacing.value,
  }));

  const [analogLines, setAnalogLines] = useState(() => [
    makeAnalog(18, ANALOG_CHARS),
    makeAnalog(14, ANALOG_CHARS),
    makeAnalog(20, ANALOG_CHARS),
  ]);
  const [binaryLines, setBinaryLines] = useState(() => [
    makeBinary(9),
    makeBinary(7),
    makeBinary(11),
  ]);

  const scanAnim = useRef(new Animated.Value(0)).current;
  const containerHeight = useRef(0);

  useEffect(() => {
    if (!showBridge) return;

    const analogInterval = setInterval(() => {
      setAnalogLines([
        makeAnalog(Math.floor(14 + Math.random() * 6), ANALOG_CHARS),
        makeAnalog(Math.floor(10 + Math.random() * 8), ANALOG_CHARS),
        makeAnalog(Math.floor(16 + Math.random() * 6), ANALOG_CHARS),
      ]);
    }, Math.floor(50 + Math.random() * 100));

    const binaryInterval = setInterval(() => {
      setBinaryLines([
        makeBinary(Math.floor(7 + Math.random() * 4)),
        makeBinary(Math.floor(5 + Math.random() * 6)),
        makeBinary(Math.floor(9 + Math.random() * 3)),
      ]);
    }, 200);

    return () => {
      clearInterval(analogInterval);
      clearInterval(binaryInterval);
    };
  }, [showBridge]);

  useEffect(() => {
    if (!showBridge) return;

    const runScan = () => {
      scanAnim.setValue(0);
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 3200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) runScan();
      });
    };
    runScan();
    return () => scanAnim.stopAnimation();
  }, [showBridge, scanAnim]);

  const scanTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, containerHeight.current || 200],
  });

  const fontSize = size === 'large' ? 28 : 18;
  const analogColor = theme.gold;
  const binaryColor = theme.accentSoft;

  if (!showBridge) {
    return (
      <View style={styles.compact}>
        <AnimatedText
          style={[styles.symbol, symbolStyle, { fontSize, color: theme.accent, fontFamily: 'CourierPrime' }]}
        >
          ..: :..
        </AnimatedText>
        <Text style={[styles.stateLabel, { color: `${theme.accent}50` }]}>
          {cycleWord}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={styles.bridge}
      onLayout={(e) => { containerHeight.current = e.nativeEvent.layout.height; }}
    >
      {Platform.OS !== 'web' && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.scanLine,
            { backgroundColor: `${theme.accent}22`, transform: [{ translateY: scanTranslate }] },
          ]}
        />
      )}

      <View style={styles.analogSection}>
        {analogLines.map((line, i) => (
          <Text
            key={i}
            style={[
              styles.noiseText,
              {
                color: analogColor,
                opacity: 0.45 + i * 0.07,
                fontFamily: 'CourierPrime',
                letterSpacing: i % 2 === 0 ? 1.5 : 0.8,
              },
            ]}
          >
            {line}
          </Text>
        ))}
        <Text style={[styles.noiseLabel, { color: `${analogColor}60` }]}>analog</Text>
      </View>

      <View style={styles.membraneRow}>
        <View style={[styles.membraneLine, { backgroundColor: `${theme.border}80` }]} />
        <View style={styles.membraneCenter}>
          <AnimatedText
            style={[styles.symbol, symbolStyle, { fontSize, color: theme.accent, fontFamily: 'CourierPrime' }]}
          >
            ..: :..
          </AnimatedText>
        </View>
        <View style={[styles.membraneLine, { backgroundColor: `${theme.border}80` }]} />
      </View>

      <View style={styles.digitalSection}>
        <Text style={[styles.noiseLabel, { color: `${binaryColor}60` }]}>digital</Text>
        {binaryLines.map((line, i) => (
          <Text
            key={i}
            style={[
              styles.noiseText,
              {
                color: binaryColor,
                opacity: 0.5 + i * 0.1,
                fontFamily: 'CourierPrime',
                letterSpacing: 2,
              },
            ]}
          >
            {line}
          </Text>
        ))}
      </View>

    </View>
  );
}

export function KnowledgeBridge(props: Props) {
  return <DataBridge {...props} />;
}

const styles = StyleSheet.create({
  compact: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bridge: {
    width: '100%',
    overflow: 'hidden',
    gap: 8,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    zIndex: 10,
    pointerEvents: 'none',
  },
  analogSection: {
    alignItems: 'flex-start',
    gap: 4,
    paddingHorizontal: 4,
  },
  digitalSection: {
    alignItems: 'flex-end',
    gap: 4,
    paddingHorizontal: 4,
  },
  noiseText: {
    fontSize: 11,
    lineHeight: 15,
  },
  noiseLabel: {
    fontSize: 8,
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontFamily: 'CourierPrime',
  },
  membraneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  membraneLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  membraneCenter: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  symbol: {
    fontWeight: '400',
  },
  stateLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 9,
    letterSpacing: 2.5,
    textTransform: 'lowercase',
    marginTop: 4,
  },
});
