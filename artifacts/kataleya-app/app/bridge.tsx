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
import Svg, { Path } from 'react-native-svg';
import { ScanlineLayer } from '@/components/scanline-layer';
import { useRouter } from 'expo-router';
import { OuroborosRing } from '@/components/OuroborosRing';
import { getCurrentPhase, getCurrentMinutes, CIRCADIAN_PHASES } from '@/constants/circadian';
import { themeForPhase } from '@/constants/theme';
import { Surface, Sanctuary } from '@/utils/storage';
import { TypewriterText } from '@/components/typewriter-text';

const { width: W, height: H } = Dimensions.get('window');
const RING_SIZE = Math.min(W * 0.72, 280);

// ── Phrase pools — garden language, knows what time it is ─────────────────────
// Seeded by day-of-year + hour-block so it shifts across the day and day to day
// without needing storage. Stable within the same hour, different tomorrow.
const BRIDGE_PHRASES: Record<string, string[]> = {
  dawn: [
    'the garden wakes.\nso do you.',
    'the signal returns.\nyou chose to come back.',
    'morning again.\nyou made it here.',
    'something held last night.\nthat was you.',
    'another day begins.\nyou are in it.',
  ],
  day: [
    'you are present.\nthat is enough.',
    'maximum clarity.\neverything nominal.',
    'the work continues.\nso do you.',
    'you are here.\nthat is enough.',
    'the garden is awake.\nso are you.',
  ],
  goldenHour: [
    'the threshold.\nhold.',
    'between one self and the next.\nhold.',
    'the garden knows\nwhat season this is.',
    'this feeling has a lifespan.\noutlast it.',
    'the light is changing.\nso are you.',
  ],
  night: [
    'the garden is open.\neven now.',
    'minimal signature.\nmaximum awareness.',
    '2am always ends.',
    'the garden doesn\u2019t judge the winter.',
    'even in winter,\nthe roots hold.',
    'rest is not surrender.\nit is preparation.',
  ],
};

function getBridgePhrase(phase: string): string {
  const pool = BRIDGE_PHRASES[phase] ?? BRIDGE_PHRASES.night;
  const now  = new Date();
  const dayOfYear  = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const hourBlock  = Math.floor(now.getHours() / 3); // changes every 3 hours
  const idx = (dayOfYear * 8 + hourBlock) % pool.length;
  return pool[idx];
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
  const [bridgePhrase, setBridgePhrase] = useState<string>('');

  // Animated values
  const fadeIn          = useRef(new Animated.Value(0)).current;
  const phraseOpacity   = useRef(new Animated.Value(0)).current;
  const enterOpacity    = useRef(new Animated.Value(0)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const orbOpacity      = useRef(new Animated.Value(0)).current;

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const mins = getCurrentMinutes();
    const p = getCurrentPhase(mins);
    setPhase(p);
    setBridgePhrase(getBridgePhrase(p));

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

      {/* CRT scanlines */}
      <ScanlineLayer />

      {/* HUD corner brackets — cockpit frame, fades in with orb */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: orbOpacity }]} pointerEvents="none">
        {/* Top-left */}
        <View style={[styles.corner, styles.cornerTL, { borderColor: `rgba(${accentRgb}, 0.38)` }]} />
        {/* Top-right */}
        <View style={[styles.corner, styles.cornerTR, { borderColor: `rgba(${accentRgb}, 0.38)` }]} />
        {/* Bottom-left */}
        <View style={[styles.corner, styles.cornerBL, { borderColor: `rgba(${accentRgb}, 0.38)` }]} />
        {/* Bottom-right */}
        <View style={[styles.corner, styles.cornerBR, { borderColor: `rgba(${accentRgb}, 0.38)` }]} />
      </Animated.View>

      {/* Phase whisper — terminal system label */}
      <Text style={[styles.phaseWhisper, { color: `rgba(${accentRgb}, 0.35)` }]}>
        ◈ {ouroborosPhase}
      </Text>

      {/* Central composition */}
      <View style={styles.center}>

        {/* Orbital arc fragments — tight corona around the ring */}
        {(() => {
          const S = RING_SIZE * 1.15;
          const cx = S / 2;
          const cy = S / 2;
          const arcs = [
            { r: RING_SIZE * 0.54, startDeg: 20,  sweepDeg: 38, opacity: 0.07  },
            { r: RING_SIZE * 0.51, startDeg: 195, sweepDeg: 32, opacity: 0.09  },
            { r: RING_SIZE * 0.57, startDeg: 122, sweepDeg: 24, opacity: 0.055 },
          ];
          const toRad = (d: number) => (d * Math.PI) / 180;
          return (
            <Animated.View style={[styles.arcWrap, { opacity: orbOpacity }]} pointerEvents="none">
              <Svg width={S} height={S}>
                {arcs.map((arc, i) => {
                  const x1 = cx + arc.r * Math.cos(toRad(arc.startDeg));
                  const y1 = cy + arc.r * Math.sin(toRad(arc.startDeg));
                  const x2 = cx + arc.r * Math.cos(toRad(arc.startDeg + arc.sweepDeg));
                  const y2 = cy + arc.r * Math.sin(toRad(arc.startDeg + arc.sweepDeg));
                  return (
                    <Path
                      key={i}
                      d={`M ${x1} ${y1} A ${arc.r} ${arc.r} 0 0 1 ${x2} ${y2}`}
                      fill="none"
                      stroke={`rgba(${accentRgb}, ${arc.opacity})`}
                      strokeWidth={0.6}
                    />
                  );
                })}
              </Svg>
            </Animated.View>
          );
        })()}


        {/* OuroborosRing — turning, scarred, never closing */}
        <Animated.View style={[styles.ringWrap, {
          opacity: orbOpacity,
          transform: [{ perspective: 600 }, { rotateX: '-12deg' }],
        }]} pointerEvents="none">
          <OuroborosRing
            size={RING_SIZE}
            color={theme.accent}
            cycleCount={0}
            phase={phase as any}
            breathing={true}
            showDots={true}
          />
        </Animated.View>

        {/* Hollow — dark recess, butterfly sits within */}
        <Animated.View style={[styles.hollowWrap, {
          opacity: orbOpacity,
          transform: [{ perspective: 600 }, { rotateX: '-12deg' }],
        }]} pointerEvents="none">
          <View style={[styles.hollow, {
            backgroundColor: 'rgba(5,5,8,0.62)',
            borderColor: `rgba(${accentRgb},0.1)`,
          }]} />
        </Animated.View>

        {/* Butterfly at center — coplanar with ring and hollow */}
        <Animated.View style={[styles.butterflyWrap, {
          opacity: orbOpacity,
          transform: [{ perspective: 600 }, { rotateX: '-12deg' }],
        }]}>
          <Image
            source={require('../assets/images/butterfly-dna-t.gif')}
            style={{ width: RING_SIZE * 0.34, height: RING_SIZE * 0.34, opacity: 0.82 }}
            resizeMode="contain"
          />
        </Animated.View>

      </View>

      {/* System status readout — below ring, fades in with enter */}
      <Animated.Text style={[styles.systemStatus, {
        color: `rgba(${accentRgb}, 0.22)`,
        opacity: enterOpacity,
      }]}>
        sys · nominal · {ouroborosPhase}
      </Animated.Text>

      {/* Garden phrase — typed in, knows what time it is */}
      <Animated.View style={[styles.phraseWrap, { opacity: phraseOpacity }]}>
        <TypewriterText
          text={bridgePhrase}
          speed={14}
          jitter={6}
          startDelay={0}
          style={[styles.phrase, { color: `rgba(${accentRgb}, 0.72)` }]}
        />
      </Animated.View>

      {/* Enter — one action, user controlled */}
      <Animated.View style={[styles.enterWrap, { opacity: enterOpacity }]}>
        <TouchableOpacity
          onPress={navigate}
          activeOpacity={0.7}
          style={[styles.enterBtn, {
            borderColor: `rgba(${accentRgb}, 0.28)`,
            borderTopColor: `rgba(${accentRgb}, 0.5)`,
            borderTopWidth: 1.5,
            backgroundColor: `rgba(${accentRgb}, 0.05)`,
            shadowColor: `rgb(${accentRgb})`,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.28,
            shadowRadius: 10,
            elevation: 4,
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
  hollowWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hollow: {
    width: RING_SIZE * 0.42,
    height: RING_SIZE * 0.42,
    borderRadius: RING_SIZE * 0.21,
    borderWidth: 1,
  },
  butterflyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  phraseWrap: {
    marginTop: 20,
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
  arcWrap: {
    position: 'absolute',
    width: RING_SIZE * 1.15,
    height: RING_SIZE * 1.15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderWidth: 0,
  },
  cornerTL: {
    top: Platform.OS === 'ios' ? 58 : 42,
    left: 22,
    borderTopWidth: 1,
    borderLeftWidth: 1,
  },
  cornerTR: {
    top: Platform.OS === 'ios' ? 58 : 42,
    right: 22,
    borderTopWidth: 1,
    borderRightWidth: 1,
  },
  cornerBL: {
    bottom: 42,
    left: 22,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
  },
  cornerBR: {
    bottom: 42,
    right: 22,
    borderBottomWidth: 1,
    borderRightWidth: 1,
  },
  systemStatus: {
    fontFamily: 'CourierPrime',
    fontSize: 9,
    letterSpacing: 2.5,
    textTransform: 'lowercase',
    marginTop: 10,
  },
  enterWrap: {
    marginTop: 28,
    alignItems: 'center',
  },
  enterBtn: {
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 13,
    paddingHorizontal: 56,
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
