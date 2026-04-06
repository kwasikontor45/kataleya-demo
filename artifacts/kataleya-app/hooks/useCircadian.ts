import { useEffect, useState, useCallback, useRef } from 'react';
import {
  CircadianPhase,
  CIRCADIAN_PHASES,
  getCurrentMinutes,
  calculateBlendRatio,
  getCurrentPhase,
  isInTransition,
  msUntilNextMinute,
} from '@/constants/circadian';
import { themeForPhase, ThemeTokens } from '@/constants/theme';
import { Surface } from '@/utils/storage';

export interface CircadianState {
  phase: CircadianPhase;
  blend: number;
  theme: ThemeTokens;
  phaseConfig: typeof CIRCADIAN_PHASES[CircadianPhase];
  isGoldenHour: boolean;
  darkOverride: boolean;
  setDarkOverride: (v: boolean) => void;
}

function computeState(): { phase: CircadianPhase; blend: number } {
  const minutes = getCurrentMinutes();
  return {
    phase: getCurrentPhase(minutes),
    blend: calculateBlendRatio(minutes),
  };
}

export function useCircadian(): CircadianState {
  const [state, setState] = useState<{ phase: CircadianPhase; blend: number }>(computeState);
  const [darkOverride, setDarkOverrideState] = useState<boolean>(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Surface.getDarkOverride().then(setDarkOverrideState).catch(() => {});
  }, []);

  const setDarkOverride = useCallback((v: boolean) => {
    setDarkOverrideState(v);
    Surface.setDarkOverride(v).catch(() => {});
  }, []);

  const schedule = useCallback(() => {
    const next = computeState();
    setState(next);

    if (timerRef.current) clearTimeout(timerRef.current);

    const minutes = getCurrentMinutes();
    const inTransition = isInTransition(minutes);
    let delayMs: number;

    if (inTransition) {
      delayMs = 10_000;
    } else {
      delayMs = msUntilNextMinute();
    }

    timerRef.current = setTimeout(schedule, delayMs);
  }, []);

  useEffect(() => {
    schedule();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [schedule]);

  const effectiveBlend = darkOverride ? 1 : state.blend;
  const theme = themeForPhase(darkOverride ? 'night' : state.phase);

  return {
    phase: state.phase,
    blend: effectiveBlend,
    theme,
    phaseConfig: CIRCADIAN_PHASES[state.phase],
    isGoldenHour: !darkOverride && state.phase === 'goldenHour',
    darkOverride,
    setDarkOverride,
  };
}
