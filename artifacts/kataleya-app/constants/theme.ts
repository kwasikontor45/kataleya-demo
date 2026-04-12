// constants/theme.ts
// ─────────────────────────────────────────────────────────────────────────────
// Ouroboros Protocol — Scar Palette
// All phases share Null Black (#050508) as base.
// Accent shifts per phase. Background never changes — only the signal does.
//
// themeForPhase() accepts an optional Palette so the color system is
// fully palette-driven. Defaults to Ouroboros when no palette is given.
// ─────────────────────────────────────────────────────────────────────────────
import { PALETTES, Palette } from './palettes';

export interface ThemeTokens {
  bg: string;
  surface: string;
  surfaceHighlight: string;
  gold: string;
  accent: string;
  accentSoft: string;
  text: string;
  textMuted: string;
  textInverse: string;
  success: string;
  warning: string;
  danger: string;
  phaseRgb: string;
  border: string;
}

// ── Shared base across all phases ─────────────────────────────────────────────
const BASE = {
  bg:               '#050508',   // Null Black — the void before choice
  surface:          '#0d0d14',   // barely lifted from void
  surfaceHighlight: '#14141f',   // active surface
  text:             '#e8e6f0',   // near-white, cool undertone
  textMuted:        '#8a8a9e',   // Scar Silver — past iterations, neutralised
  textInverse:      '#050508',
  success:          '#00d4aa',   // Choice Cyan — always the mark of clarity
  warning:          '#ff6b35',   // Craving Amber — acknowledge, don't suppress
  danger:           '#ff3366',   // scar red
  border:           '#1c1c28',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
export type CircadianPhase = 'dawn' | 'day' | 'goldenHour' | 'night';

// Build a ThemeTokens from the active palette + phase.
// All callers that already pass no palette get Ouroboros (backward compatible).
export function themeForPhase(phase: CircadianPhase, palette?: Palette): ThemeTokens {
  const p     = palette ?? PALETTES.ouroboros;
  const colors = p[phase];
  return {
    ...BASE,
    gold:       colors.accent,
    accent:     colors.accent,
    accentSoft: colors.accentSoft,
    phaseRgb:   colors.phaseRgb,
  };
}

// Legacy static theme exports — still valid when palette is Ouroboros
export const DawnTheme        = themeForPhase('dawn');
export const DayTheme         = themeForPhase('day');
export const GoldenHourTheme  = themeForPhase('goldenHour');
export const NightTheme       = themeForPhase('night');
export const MidnightGarden   = NightTheme;

export function getPhasePair(phase: CircadianPhase, palette?: Palette): [ThemeTokens, ThemeTokens] {
  switch (phase) {
    case 'dawn':       return [themeForPhase('night', palette),      themeForPhase('dawn', palette)];
    case 'day':        return [themeForPhase('dawn', palette),        themeForPhase('day', palette)];
    case 'goldenHour': return [themeForPhase('day', palette),         themeForPhase('goldenHour', palette)];
    case 'night':      return [themeForPhase('goldenHour', palette),  themeForPhase('night', palette)];
    default:           return [themeForPhase('night', palette),       themeForPhase('night', palette)];
  }
}
