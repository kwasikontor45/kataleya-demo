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

// ── DAWN (05:00–08:00) — systems coming online ────────────────────────────────
// Choice Cyan. The moment of first light. Irreversible.
export const DawnTheme: ThemeTokens = {
  ...BASE,
  gold:        '#00d4aa',
  accent:      '#00d4aa',   // Choice Cyan
  accentSoft:  '#007a62',
  phaseRgb:    '0,212,170',
};

// ── DAY (08:00–17:00) — full presence, everything nominal ─────────────────────
// Cyan at peak brightness. The sharpest the signal gets.
export const DayTheme: ThemeTokens = {
  ...BASE,
  gold:        '#00ecc4',
  accent:      '#00ecc4',   // brightest cyan — maximum clarity
  accentSoft:  '#00d4aa',
  phaseRgb:    '0,236,196',
};

// ── GOLDEN HOUR (17:00–20:00) — the threshold ────────────────────────────────
// Craving Amber. Desire acknowledged, not suppressed.
// The heaviest phase. Between one self and the next.
export const GoldenHourTheme: ThemeTokens = {
  ...BASE,
  gold:        '#ff6b35',
  accent:      '#ff6b35',   // Craving Amber
  accentSoft:  '#cc4a1a',
  phaseRgb:    '255,107,53',
};

// ── NIGHT (20:00–05:00) — cloaked, maximum awareness ─────────────────────────
// Resolve Violet. The self that survives the cycle. Sharpened.
export const NightTheme: ThemeTokens = {
  ...BASE,
  gold:        '#8a5fe0',
  accent:      '#8a5fe0',   // Resolve Violet — pulled back, less saturated
  accentSoft:  '#6b48b0',
  phaseRgb:    '138,95,224',
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
