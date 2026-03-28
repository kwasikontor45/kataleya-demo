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
import { MorningBloom, MidnightGarden, interpolateTheme, ThemeTokens } from '@/constants/theme';

export interface CircadianState {
  phase: CircadianPhase;
  blend: number;
  theme: ThemeTokens;
  phaseConfig: typeof CIRCADIAN_PHASES[CircadianPhase];
  isGoldenHour: boolean;
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const theme = interpolateTheme(MorningBloom, MidnightGarden, state.blend);

  return {
    phase: state.phase,
    blend: state.blend,
    theme,
    phaseConfig: CIRCADIAN_PHASES[state.phase],
    isGoldenHour: state.phase === 'goldenHour',
  };
}
