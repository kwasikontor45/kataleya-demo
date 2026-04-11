'use no memo';
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  StyleSheet,
  Easing,
} from 'react-native';
import { ThemeTokens } from '@/constants/theme';
import { CircadianPhase } from '@/constants/circadian';
import { NEON_RGB } from './NeonCard';

/**
 * GhostPulseOrb — replaces OrchidProgress as the central visual on the
 * Sanctuary home screen.
 *
 * Three concentric animated rings pulse at different rates. The core glows
 * and scales with the responsive heart BPM engine. Ring size scales with
 * milestone stage so growth is visually communicated without botanical metaphor.
 *
 * Color shifts with circadian phase — Scar Palette:
 *   dawn        → Choice Cyan    (#00d4aa)  systems online
 *   day         → Day Cyan       (#00ecc4)  full presence
 *   goldenHour  → Craving Amber  (#ff6b35)  the threshold
 *   night       → Resolve Violet (#9b6dff)  deep cloak
 *
 * The restlessnessScore (0–1) from useOrchidSway makes the outer ring
 * ripple faster when the user is physically agitated.
 */

// Milestone day thresholds → orb size
function orbSizeForDays(daysSober: number): number {
  if (daysSober >= 365) return 112;
  if (daysSober >= 180) return 104;
  if (daysSober >= 90)  return 96;
  if (daysSober >= 30)  return 88;
  if (daysSober >= 14)  return 80;
  if (daysSober >= 7)   return 74;
  if (daysSober >= 1)   return 68;
  return 62; // seed
}

// Stage label for ambient display below orb
// Human-readable recovery stage — shown below the orb
// Tells the user where they are in plain language
function stageLabel(daysSober: number): string {
  if (daysSober >= 365) return 'one full cycle complete';
  if (daysSober >= 180) return 'sharpened through six months';
  if (daysSober >= 90)  return 'three months — the scar holds';
  if (daysSober >= 30)  return 'one month rewritten';
  if (daysSober >= 14)  return 'two weeks of chosen return';
  if (daysSober >= 7)   return 'one cycle closed';
  if (daysSober >= 1)   return 'the first mark is made';
  return 'the signal is waiting for you';
}

// What the movement sensor shows — plain English
function restlessnessLabel(score: number): string {
  if (score > 0.7) return 'moving through it';
  if (score > 0.35) return 'some restlessness';
  return '';
}

function phaseAccentRgb(phase: CircadianPhase): string {
  switch (phase) {
    case 'goldenHour': return NEON_RGB.amber;
    case 'night':      return NEON_RGB.violet;
    case 'dawn':       return NEON_RGB.pink;
    default:           return NEON_RGB.cyan;
  }
}

interface Props {
  theme: ThemeTokens;
  phase: CircadianPhase;
  daysSober: number;
  restlessnessScore?: number;  // 0–1 from useOrchidSway
  systemState?: string;        // from useResponsiveHeart: 'holding' | 'present' | 'attuned' | 'celebrating'
  bpm?: number;                // from useResponsiveHeart, drives ring pulse speed
}

export function GhostPulseOrb({
  theme,
  phase,
  daysSober,
  restlessnessScore = 0,
  systemState = 'present',
  bpm = 60,
}: Props) {
  const rgb = phaseAccentRgb(phase);
  const coreSize = orbSizeForDays(daysSober);

  // Ring animation — three rings at different speeds and scales
  const ring1Anim = useRef(new Animated.Value(0)).current;
  const ring2Anim = useRef(new Animated.Value(0)).current;
  const ring3Anim = useRef(new Animated.Value(0)).current;
  const coreAnim  = useRef(new Animated.Value(0)).current;

  // Restlessness makes outer ring pulse faster
  const outerDuration = Math.max(1600, 3200 - restlessnessScore * 1200);
  // BPM drives core pulse speed
  const coreDuration  = Math.round((60 / bpm) * 1000);

  useEffect(() => {
    const pulse = (anim: Animated.Value, duration: number, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: duration / 2,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: duration / 2,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );

    const r1 = pulse(ring1Anim, outerDuration, 0).start();
    const r2 = pulse(ring2Anim, outerDuration * 1.25, 600).start();
    const r3 = pulse(ring3Anim, outerDuration * 1.6, 1200).start();
    const c  = pulse(coreAnim, coreDuration, 0).start();

    return () => {
      ring1Anim.stopAnimation();
      ring2Anim.stopAnimation();
      ring3Anim.stopAnimation();
      coreAnim.stopAnimation();
    };
  }, [outerDuration, coreDuration]);

  const ring1Opacity = ring1Anim.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.28] });
  const ring2Opacity = ring2Anim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.20] });
  const ring3Opacity = ring3Anim.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.14] });
  const coreOpacity  = coreAnim.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1.0] });
  const coreScale    = coreAnim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.04] });

  const ring1Size = coreSize + 20;
  const ring2Size = coreSize + 40;
  const ring3Size = coreSize + 64;
  const wrapSize  = ring3Size + 8;

  return (
    <View style={styles.container}>
      {/* Outer glow rings */}
      <View style={[styles.ringWrap, { width: wrapSize, height: wrapSize }]}>
        <Animated.View
          style={[
            styles.ring,
            {
              width: ring3Size,
              height: ring3Size,
              borderRadius: ring3Size / 2,
              borderColor: `rgba(${rgb}, 1)`,
              borderWidth: 0.5,
              opacity: ring3Opacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            {
              width: ring2Size,
              height: ring2Size,
              borderRadius: ring2Size / 2,
              borderColor: `rgba(${rgb}, 1)`,
              borderWidth: 0.8,
              opacity: ring2Opacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.ring,
            {
              width: ring1Size,
              height: ring1Size,
              borderRadius: ring1Size / 2,
              borderColor: `rgba(${rgb}, 1)`,
              borderWidth: 1,
              opacity: ring1Opacity,
            },
          ]}
        />

        {/* Core orb */}
        <Animated.View
          style={[
            styles.core,
            {
              width: coreSize,
              height: coreSize,
              borderRadius: coreSize / 2,
              backgroundColor: `rgba(${rgb}, 0.08)`,
              borderColor: `rgba(${rgb}, 0.35)`,
              borderWidth: 1,
              opacity: coreOpacity,
              transform: [{ scale: coreScale }],
            },
          ]}
        >
          <Animated.Image
            source={require('../assets/images/butterfly-dna.gif')}
            style={[
              styles.butterfly,
              {
                width: coreSize * 0.72,
                height: coreSize * 0.72,
                opacity: coreOpacity,
                tintColor: `rgba(${rgb}, 0.85)`,
              },
            ]}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* Stage label — human readable recovery context */}
      <Text style={[styles.stageText, { color: `rgba(${rgb}, 0.55)` }]}>
        {stageLabel(daysSober)}
      </Text>
      {restlessnessScore > 0.35 && (
        <Text style={[styles.restlessText, { color: `rgba(${rgb}, 0.35)` }]}>
          {restlessnessLabel(restlessnessScore)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    borderStyle: 'solid',
  },
  core: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'solid',
  },
  butterfly: {
    borderRadius: 999,
  },
  stageText: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 12,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  restlessText: {
    fontFamily: 'CourierPrime',
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 3,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  stateWord: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginTop: 14,
    textAlign: 'center',
  },
});
