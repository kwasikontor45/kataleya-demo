// app/bridge.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The bridge screen. First thing every session.
// Not a loading screen — a moment of arrival.
//
// The OuroborosRing turns slowly. The phase declares itself.
// One phrase from the garden. One action: enter.
// The user lands before they do anything.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing,
  TouchableOpacity, Dimensions, Platform, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { OuroborosRing } from '@/components/OuroborosRing';
import { getCurrentPhase, getCurrentMinutes, CIRCADIAN_PHASES } from '@/constants/circadian';
import { themeForPhase } from '@/constants/theme';
import { Surface, Sanctuary } from '@/utils/storage';

const { width: W, height: H } = Dimensions.get('window');
const RING_SIZE = Math.min(W * 0.72, 280);

// ── One phrase per phase — garden language, knows what time it is ─────────────
const BRIDGE_PHRASES: Record<string, string[]> = {
  dawn:       ['the garden wakes.\nso do you.', 'morning.\nthe garden held.'],
  day:        ['you are present.\nthat is enough.', 'the garden is awake.\nso are you.'],
  goldenHour: ['the threshold.\nhold.', 'between one self and the next.\nhold.'],
  night:      ['still here.\nso is the garden.', 'the night held.\nmorning is close.'],
};

function getBridgePhrase(phase: string): string {
  const pool = BRIDGE_PHRASES[phase] ?? BRIDGE_PHRASES.night;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getAccentRgb(phase: string): string {
  if (phase === 'night')      return '138,95,224';
  if (phase === 'goldenHour') return '255,107,53';
  if (phase === 'dawn')       return '255,100,180';
  return '0,212,170';
}

export default function BridgeScreen() {
  const router = useRouter();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [enterReady, setEnterReady] = useState(false);
  const [phase, setPhase] = useState<string>('night');

  // Animated values
  const fadeIn       = useRef(new Animated.Value(0)).current;
  const phraseOpacity = useRef(new Animated.Value(0)).current;
  const enterOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const orbOpacity   = useRef(new Animated.Value(0)).current;

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const mins = getCurrentMinutes();
    const p = getCurrentPhase(mins);
    setPhase(p);

    if (Platform.OS !== 'web') {
      Sanctuary.logCircadianEvent({ ts: Date.now(), phase: p, event: 'app_open' }).catch(() => {});
    }

    const init = async () => {
      try {
        const done = await Surface.hasOnboarded();
        setOnboarded(done);
      } catch {
        setOnboarded(false);
      }
      setEnterReady(true);
    };
    init();
  }, []);

  // ── Animation sequence ────────────────────────────────────────────────────
  useEffect(() => {
    // Screen fades in
    Animated.timing(fadeIn, {
      toValue: 1, duration: 1200,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.sin),
    }).start();

    // Orb fades in
    Animated.timing(orbOpacity, {
      toValue: 1, duration: 1800, delay: 400,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.sin),
    }).start();

    // Phrase fades in after orb
    Animated.timing(phraseOpacity, {
      toValue: 1, duration: 1200, delay: 1400,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.sin),
    }).start();

    // Enter fades in last — user controls when they go
    Animated.timing(enterOpacity, {
      toValue: 1, duration: 1000, delay: 3200,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.sin),
    }).start();

    // Wordmark barely visible
    Animated.timing(wordmarkOpacity, {
      toValue: 0.12, duration: 2000, delay: 4000,
      useNativeDriver: true,
    }).start();
  }, []);

  const navigate = useCallback(() => {
    if (!enterReady) return;
    router.replace(onboarded === false ? '/onboarding' : '/(tabs)');
  }, [onboarded, enterReady, router]);

  const accentRgb = getAccentRgb(phase);
  const theme = themeForPhase(phase as any);
  const ouroborosPhase = phase === 'night' ? 'void'
    : phase === 'goldenHour' ? 'desire'
    : phase === 'dawn' ? 'renewal'
    : 'choice';

  return (
    <Animated.View style={[styles.root, { backgroundColor: '#050508', opacity: fadeIn }]}>

      {/* Phase whisper — top center */}
      <Text style={[styles.phaseWhisper, { color: `rgba(${accentRgb}, 0.18)` }]}>
        {ouroborosPhase}
      </Text>

      {/* Central composition */}
      <View style={styles.center}>

        {/* OuroborosRing — turning, scarred, never closing */}
        <Animated.View style={[styles.ringWrap, { opacity: orbOpacity }]} pointerEvents="none">
          <OuroborosRing
            size={RING_SIZE}
            color={theme.accent}
            cycleCount={0}
            phase={phase as any}
            breathing={true}
            showDots={true}
          />
        </Animated.View>

        {/* Butterfly at center — transformation */}
        <Animated.View style={[styles.butterflyWrap, { opacity: orbOpacity }]}>
          <Image
            source={require('../assets/images/butterfly-dna-t.gif')}
            style={{ width: RING_SIZE * 0.38, height: RING_SIZE * 0.38 }}
            resizeMode="contain"
          />
        </Animated.View>

      </View>

      {/* Garden phrase — one line, knows what time it is */}
      <Animated.View style={[styles.phraseWrap, { opacity: phraseOpacity }]}>
        <Text style={[styles.phrase, { color: `rgba(${accentRgb}, 0.72)` }]}>
          {getBridgePhrase(phase)}
        </Text>
      </Animated.View>

      {/* Enter — one action, user controlled */}
      <Animated.View style={[styles.enterWrap, { opacity: enterOpacity }]}>
        <TouchableOpacity
          onPress={navigate}
          activeOpacity={0.7}
          style={[styles.enterBtn, {
            borderColor: `rgba(${accentRgb}, 0.28)`,
            backgroundColor: `rgba(${accentRgb}, 0.05)`,
          }]}
        >
          <Text style={[styles.enterText, { color: `rgba(${accentRgb}, 0.8)` }]}>
            enter
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Wordmark — barely there */}
      <Animated.Text style={[styles.wordmark, {
        color: `rgba(${accentRgb}, 1)`,
        opacity: wordmarkOpacity,
      }]}>
        kataleya
      </Animated.Text>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseWhisper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 64 : 48,
    fontFamily: 'CourierPrime',
    fontSize: 9,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  center: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  butterflyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  phraseWrap: {
    marginTop: 32,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  phrase: {
    fontFamily: 'CourierPrime',
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'center',
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },
  enterWrap: {
    marginTop: 40,
    alignItems: 'center',
  },
  enterBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 48,
  },
  enterText: {
    fontFamily: 'CourierPrime',
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'lowercase',
  },
  wordmark: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 48 : 32,
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 6,
    textTransform: 'lowercase',
  },
});
