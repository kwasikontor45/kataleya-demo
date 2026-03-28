import { useEffect, useState, useRef } from 'react';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { CircadianPhase } from '@/constants/circadian';
import { Sanctuary } from '@/utils/storage';

interface HeartBiometrics {
  bpm: number;
  inhaleMs: number;
  holdMs: number;
  exhaleMs: number;
  amplitude: number;
  opacityRange: [number, number];
}

function defaultBiometrics(): HeartBiometrics {
  return {
    bpm: 60,
    inhaleMs: 800,
    holdMs: 200,
    exhaleMs: 800,
    amplitude: 0.08,
    opacityRange: [0.45, 0.95],
  };
}

export function useResponsiveHeart(phase: CircadianPhase) {
  const [biometrics, setBiometrics] = useState<HeartBiometrics>(defaultBiometrics);
  const opacity = useSharedValue(0.45);
  const scale = useSharedValue(0.97);
  const letterSpacingVal = useSharedValue(4);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const calculate = async () => {
      const mood = await Sanctuary.getRecentMoodState();

      let bpm = 52 + (mood.lastScore - 1) * 1.3;
      if (mood.avgRestlessness > 0.6) bpm += 3;
      if (phase === 'night') bpm -= 4;
      if (phase === 'goldenHour') bpm += 2;
      if (mood.hoursSince > 6) bpm += 3;
      bpm = Math.max(52, Math.min(65, bpm));

      const cycleMs = 60000 / bpm;
      let ratios: [number, number, number];
      if (mood.lastScore <= 3) {
        ratios = [0.3, 0.2, 0.5];
      } else if (mood.lastScore >= 8) {
        ratios = [0.4, 0.1, 0.5];
      } else {
        ratios = [0.35, 0.15, 0.5];
      }

      const inhaleMs = cycleMs * ratios[0];
      const holdMs = cycleMs * ratios[1];
      const exhaleMs = cycleMs * ratios[2];
      const amplitude = mood.avgRestlessness > 0.7 ? 0.05 : mood.hoursSince > 12 ? 0.12 : 0.08;
      const opacityRange: [number, number] = mood.lastScore <= 3 ? [0.3, 0.8] : [0.5, 1.0];

      if (!mountedRef.current) return;
      setBiometrics({ bpm, inhaleMs, holdMs, exhaleMs, amplitude, opacityRange });
    };

    calculate();
    const interval = setInterval(calculate, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    const { inhaleMs, holdMs, exhaleMs, amplitude, opacityRange } = biometrics;

    const animate = () => {
      opacity.value = withTiming(opacityRange[1], {
        duration: inhaleMs,
        easing: Easing.out(Easing.sin),
      });
      scale.value = withTiming(1 + amplitude / 2, {
        duration: inhaleMs,
        easing: Easing.out(Easing.sin),
      });
      letterSpacingVal.value = withTiming(6, {
        duration: inhaleMs,
        easing: Easing.out(Easing.sin),
      });

      setTimeout(() => {
        opacity.value = withTiming(opacityRange[0], {
          duration: exhaleMs,
          easing: Easing.inOut(Easing.sin),
        });
        scale.value = withTiming(1 - amplitude / 2, {
          duration: exhaleMs,
          easing: Easing.inOut(Easing.sin),
        });
        letterSpacingVal.value = withTiming(4, {
          duration: exhaleMs,
          easing: Easing.inOut(Easing.sin),
        });
      }, inhaleMs + holdMs);
    };

    animate();
    const loop = setInterval(animate, inhaleMs + holdMs + exhaleMs);
    return () => clearInterval(loop);
  }, [biometrics, opacity, scale, letterSpacingVal]);

  return { opacity, scale, letterSpacing: letterSpacingVal, biometrics };
}
