// app/cover.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The 2am screen. The panic screen. The cover.
//
// One breathing object. Tap it and it gives you one phrase.
// No input required. No log. No output. Just presence.
// The phrase fades in 6 seconds. Then silence.
// One quiet option to return when ready.
//
// Phrase set is Ouroboros-toned — honest, sparse, not performative.
// It knows what time it is. It doesn't pretend otherwise.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, Animated,
  Easing, Dimensions, Platform, StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCircadian } from '@/hooks/useCircadian';
import { getCurrentPhase, getCurrentMinutes } from '@/constants/circadian';

const { width, height } = Dimensions.get('window');

// ── Phrase set ────────────────────────────────────────────────────────────────
// Honest. Sparse. No performance required.
// Sorted by phase — the app picks based on what time it actually is.

const PHRASES = {
  void: [
    '2am always ends.',
    "The garden doesn't judge the winter.",
    "You opened this instead.\nThat is enough.",
    'Nothing is required of you\nright now.',
    'This is the hard hour.\nYou are not alone in it.',
    'Rest is not surrender.\nIt is preparation.',
    "Even in winter,\nthe roots hold.",
    "The night always ends\nat the same place — morning.",
  ],
  desire: [
    'Acknowledge it.\nDo not feed it.',
    'The craving is information.\nNot instruction.',
    'You have been here before.\nYou have left before.',
    'Between one self and the next.\nHold.',
    'This feeling has a lifespan.\nOutlast it.',
    'You know what this is.\nYou also know what comes after.',
  ],
  renewal: [
    "The garden wakes.\nSo do you.",
    'You made it to morning.\nThat counts.',
    'This is what continuation looks like.',
    'Something held last night.\nThat was you.',
    'Another day begins.\nYou are in it.',
  ],
  choice: [
    "The garden is awake.\nSo are you.",
    'This is the window.\nUse it.',
    "Everything is growing,\neven when you can't see it.",
    'The work continues.\nSo do you.',
    "You are here.\nThat is enough.",
  ],
};

// Map circadian phase to Ouroboros phase
function getOuroborosPhase(phase: string): keyof typeof PHRASES {
  if (phase === 'night')       return 'void';
  if (phase === 'goldenHour')  return 'desire';
  if (phase === 'dawn')        return 'renewal';
  return 'choice';
}

function getPhrase(phase: string, lastIndex: number): { text: string; index: number } {
  const oPhase = getOuroborosPhase(phase);
  const pool = PHRASES[oPhase];
  let idx = Math.floor(Math.random() * pool.length);
  // Never repeat the last phrase
  if (pool.length > 1 && idx === lastIndex) {
    idx = (idx + 1) % pool.length;
  }
  return { text: pool[idx], index: idx };
}

// ── Orb sizes ─────────────────────────────────────────────────────────────────
const ORB = Math.min(width * 0.52, 220);

export default function CoverScreen() {
  const router = useRouter();
  const { theme, phase } = useCircadian();
  const soundRef = useRef<Audio.Sound | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const audioHintOpacity = useRef(new Animated.Value(0)).current;

  // Phrase state
  const [phrase, setPhrase] = useState<string | null>(null);
  const [phraseVisible, setPhraseVisible] = useState(false);
  const lastPhraseIdx = useRef(-1);
  const phraseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animated values
  const orbScale    = useRef(new Animated.Value(1)).current;
  const orbOpacity  = useRef(new Animated.Value(0.18)).current;
  const ring1Scale  = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.06)).current;
  const ring2Scale  = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(0.04)).current;
  const phraseOpacity = useRef(new Animated.Value(0)).current;
  const returnOpacity = useRef(new Animated.Value(0)).current;
  const bgGlow      = useRef(new Animated.Value(0)).current;

  const accentRgb = phase === 'night'       ? '155,109,255'
                  : phase === 'goldenHour'  ? '255,107,53'
                  : phase === 'dawn'        ? '255,100,180'
                  : '0,212,170';

  // ── Ambient breath loop ────────────────────────────────────────────────────
  useEffect(() => {
    const breath = () => {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(orbScale,    { toValue: 1.06, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(orbOpacity,  { toValue: 0.26, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(ring1Scale,  { toValue: 1.10, duration: 4800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(ring1Opacity,{ toValue: 0.12, duration: 4800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(ring2Scale,  { toValue: 1.14, duration: 5400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(ring2Opacity,{ toValue: 0.07, duration: 5400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(bgGlow,      { toValue: 1,    duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          ]),
          Animated.parallel([
            Animated.timing(orbScale,    { toValue: 1,    duration: 4800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(orbOpacity,  { toValue: 0.18, duration: 4800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(ring1Scale,  { toValue: 1,    duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(ring1Opacity,{ toValue: 0.06, duration: 5200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(ring2Scale,  { toValue: 1,    duration: 5800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(ring2Opacity,{ toValue: 0.04, duration: 5800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(bgGlow,      { toValue: 0,    duration: 4800, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
          ]),
        ])
      ).start();
    };

    breath();

    // Fade in return option after 8 seconds
    const returnTimer = setTimeout(() => {
      Animated.timing(returnOpacity, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.sin),
      }).start();
    }, 8000);

    // Load cover narration
    const loadAudio = async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/audio/kataleya-narration-cover.mp3'),
          { shouldPlay: false, volume: 0.9 }
        );
        soundRef.current = sound;
        setAudioReady(true);
        // Fade in audio hint after 12s (when return button appears)
        setTimeout(() => {
          Animated.timing(audioHintOpacity, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.sin),
          }).start();
        }, 12000);
      } catch { /* optional */ }
    };
    loadAudio();

    return () => {
      clearTimeout(returnTimer);
      soundRef.current?.unloadAsync().catch(() => {});
      [orbScale, orbOpacity, ring1Scale, ring1Opacity,
       ring2Scale, ring2Opacity, bgGlow].forEach(v => v.stopAnimation());
    };
  }, []);

  // ── Tap the orb ───────────────────────────────────────────────────────────
  const handleTap = useCallback(() => {
    if (phraseVisible) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { text, index } = getPhrase(phase, lastPhraseIdx.current);
    lastPhraseIdx.current = index;
    setPhrase(text);

    // Fade in
    phraseOpacity.setValue(0);
    Animated.timing(phraseOpacity, {
      toValue: 1,
      duration: 900,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.sin),
    }).start();

    setPhraseVisible(true);

    // Hold 5s then fade out
    if (phraseTimer.current) clearTimeout(phraseTimer.current);
    phraseTimer.current = setTimeout(() => {
      Animated.timing(phraseOpacity, {
        toValue: 0,
        duration: 1400,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.sin),
      }).start(() => {
        setPhraseVisible(false);
        setPhrase(null);
      });
    }, 5000);
  }, [phase, phraseVisible]);

  // ── Background glow interpolation ─────────────────────────────────────────
  const bgColor = bgGlow.interpolate({
    inputRange:  [0, 1],
    outputRange: [`rgba(${accentRgb}, 0.00)`, `rgba(${accentRgb}, 0.04)`],
  });

  // ── Audio toggle ─────────────────────────────────────────────────────────
  const handleAudioToggle = async () => {
    if (!soundRef.current || !audioReady) return;
    if (audioPlaying) {
      await soundRef.current.stopAsync().catch(() => {});
      await soundRef.current.setPositionAsync(0).catch(() => {});
      setAudioPlaying(false);
    } else {
      await soundRef.current.playAsync().catch(() => {});
      setAudioPlaying(true);
      // Auto-reset after playback
      soundRef.current.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) setAudioPlaying(false);
      });
    }
  };

  // ── Return handler ────────────────────────────────────────────────────────
  const handleReturn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <View style={[styles.root, { backgroundColor: '#050508' }]}>
      <StatusBar barStyle="light-content" backgroundColor="#050508" />

      {/* Ambient background glow — breathes with orb */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: bgColor }]}
        pointerEvents="none"
      />

      {/* Phase whisper — barely visible, top center */}
      <Text style={[styles.phaseWhisper, { color: `rgba(${accentRgb},0.18)` }]}>
        {phase === 'night' ? 'void' : phase === 'goldenHour' ? 'desire' : phase === 'dawn' ? 'renewal' : 'choice'}
      </Text>

      {/* Orb — the breathing object */}
      <View style={styles.orbArea}>

        {/* Ring 2 — outermost, slowest */}
        <Animated.View style={[
          styles.ring,
          {
            width: ORB * 1.6,
            height: ORB * 1.6,
            borderRadius: ORB * 0.8,
            borderColor: `rgba(${accentRgb}, 1)`,
            transform: [{ scale: ring2Scale }],
            opacity: ring2Opacity,
          },
        ]} />

        {/* Ring 1 — inner */}
        <Animated.View style={[
          styles.ring,
          {
            width: ORB * 1.22,
            height: ORB * 1.22,
            borderRadius: ORB * 0.61,
            borderColor: `rgba(${accentRgb}, 1)`,
            transform: [{ scale: ring1Scale }],
            opacity: ring1Opacity,
          },
        ]} />

        {/* Core orb — tap target */}
        <TouchableOpacity
          onPress={handleTap}
          activeOpacity={1}
          hitSlop={24}
          style={styles.orbTouch}
        >
          <Animated.View style={[
            styles.orb,
            {
              width: ORB,
              height: ORB,
              borderRadius: ORB / 2,
              borderColor: `rgba(${accentRgb}, 1)`,
              backgroundColor: `rgba(${accentRgb}, 0.04)`,
              transform: [{ scale: orbScale }],
              opacity: orbOpacity,
            },
          ]}>
            {/* Butterfly — barely visible at center, breathing with the orb */}
            <Animated.Image
              source={require('../assets/images/butterfly-dna.gif')}
              style={[
                styles.butterfly,
                {
                  width: ORB * 0.52,
                  height: ORB * 0.52,
                  opacity: orbScale.interpolate({
                    inputRange: [1, 1.06],
                    outputRange: [0.18, 0.28],
                  }),
                  // no tintColor — butterfly keeps its own colors
                },
              ]}
              resizeMode="contain"
            />
          </Animated.View>
        </TouchableOpacity>

      </View>

      {/* Phrase — appears on tap, fades */}
      <Animated.View style={[styles.phraseWrap, { opacity: phraseOpacity }]}>
        {phrase && (
          <Text style={[styles.phraseText, { color: `rgba(${accentRgb},0.85)` }]}>
            {phrase}
          </Text>
        )}
      </Animated.View>

      {/* Return — fades in after 8s */}
      <Animated.View style={[styles.returnWrap, { opacity: returnOpacity }]}>
        <TouchableOpacity onPress={handleReturn} hitSlop={16}>
          <Text style={[styles.returnText, { color: `rgba(${accentRgb},0.28)` }]}>
            return when ready
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Audio hint — appears with return button */}
      {audioReady && (
        <Animated.View style={[styles.audioWrap, { opacity: audioHintOpacity }]}>
          <TouchableOpacity onPress={handleAudioToggle} hitSlop={16}>
            <Text style={[styles.audioText, { color: `rgba(${accentRgb},0.22)` }]}>
              {audioPlaying ? '◎ playing' : '◎ amor fati'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Kataleya — barely there */}
      <Text style={[styles.wordmark, { color: `rgba(${accentRgb},0.07)` }]}>
        kataleya
      </Text>

    </View>
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
  orbArea: {
    width: ORB * 1.8,
    height: ORB * 1.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
  },
  orbTouch: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  butterfly: {
    position: 'absolute',
    alignSelf: 'center',
  },
  orb: {
    borderWidth: 1,
  },
  phraseWrap: {
    position: 'absolute',
    bottom: height * 0.28,
    left: 40,
    right: 40,
    alignItems: 'center',
  },
  phraseText: {
    fontFamily: 'CourierPrime',
    fontSize: 17,
    lineHeight: 28,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  returnWrap: {
    position: 'absolute',
    bottom: height * 0.1,
    alignItems: 'center',
  },
  returnText: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 2.5,
    textTransform: 'lowercase',
  },
  audioWrap: {
    position: 'absolute',
    bottom: 88,
    alignItems: 'center',
  },
  audioText: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'lowercase',
  },
  wordmark: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 52 : 36,
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 6,
    textTransform: 'lowercase',
  },
});
