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
import { PALETTES, Palette, DEFAULT_PALETTE_ID, PaletteId } from '@/constants/palettes';
import { Surface } from '@/utils/storage';

export interface CircadianState {
  phase:          CircadianPhase;
  blend:          number;
  theme:          ThemeTokens;
  phaseConfig:    typeof CIRCADIAN_PHASES[CircadianPhase];
  isGoldenHour:   boolean;
  darkOverride:   boolean;
  setDarkOverride: (v: boolean) => void;
  paletteId:      PaletteId;
  setPalette:     (id: PaletteId) => void;
}

function computeState(): { phase: CircadianPhase; blend: number } {
  const minutes = getCurrentMinutes();
  return {
    phase: getCurrentPhase(minutes),
    blend: calculateBlendRatio(minutes),
  };
}

export function useCircadian(): CircadianState {
  const [state, setState]             = useState<{ phase: CircadianPhase; blend: number }>(computeState);
  const [darkOverride, setDarkOverrideState] = useState<boolean>(false);
  const [paletteId, setPaletteId]     = useState<PaletteId>(DEFAULT_PALETTE_ID);
  const [palette, setPaletteObj]      = useState<Palette>(PALETTES[DEFAULT_PALETTE_ID]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Surface.getDarkOverride().then(setDarkOverrideState).catch(() => {});
    Surface.getPalette().then(id => {
      const p = PALETTES[id] ?? PALETTES[DEFAULT_PALETTE_ID];
      setPaletteId(id as PaletteId);
      setPaletteObj(p);
    }).catch(() => {});
  }, []);

  const setDarkOverride = useCallback((v: boolean) => {
    setDarkOverrideState(v);
    Surface.setDarkOverride(v).catch(() => {});
  }, []);

  const setPalette = useCallback((id: PaletteId) => {
    const p = PALETTES[id] ?? PALETTES[DEFAULT_PALETTE_ID];
    setPaletteId(id);
    setPaletteObj(p);
    Surface.setPalette(id).catch(() => {});
  }, []);

  const schedule = useCallback(() => {
    const next = computeState();
    setState(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    const minutes     = getCurrentMinutes();
    const inTransition = isInTransition(minutes);
    timerRef.current   = setTimeout(schedule, inTransition ? 10_000 : msUntilNextMinute());
  }, []);

  useEffect(() => {
    schedule();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [schedule]);

  const effectivePhase = darkOverride ? 'night' : state.phase;
  const theme          = themeForPhase(effectivePhase, palette);

  return {
    phase:           state.phase,
    blend:           darkOverride ? 1 : state.blend,
    theme,
    phaseConfig:     CIRCADIAN_PHASES[state.phase],
    isGoldenHour:    !darkOverride && state.phase === 'goldenHour',
    darkOverride,
    setDarkOverride,
    paletteId,
    setPalette,
  };
}
