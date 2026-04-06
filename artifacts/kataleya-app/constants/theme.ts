// constants/theme.ts
// ─────────────────────────────────────────────────────────────────────────────
// Fix: TypeScript interfaces cannot have hyphenated property names.
// All keys are camelCase. References in components updated to match.
// ─────────────────────────────────────────────────────────────────────────────

export interface ThemeTokens {
  bg: string;
  surface: string;
  surfaceHighlight: string;   // was surface-highlight
  gold: string;
  accent: string;
  accentSoft: string;         // was accent-soft
  text: string;
  textMuted: string;          // was text-muted
  textInverse: string;        // was text-inverse
  success: string;
  warning: string;
  danger: string;
  phaseRgb: string;           // was phase-rgb
  border: string;
}

// ── DAWN (05:00–08:00) ────────────────────────────────────────────────────────
export const DawnTheme: ThemeTokens = {
  bg:               '#0d1117',
  surface:          '#161c27',
  surfaceHighlight: '#1e2535',
  gold:             '#d4876b',
  accent:           '#8fb3cc',
  accentSoft:       '#c9a27a',
  text:             '#dce6f0',
  textMuted:        '#7a95ae',
  textInverse:      '#0d1117',
  success:          '#5ba88a',
  warning:          '#c9a27a',
  danger:           '#c06a5a',
  phaseRgb:         '143,179,204',
  border:           '#2a3648',
};

// ── DAY (08:00–17:00) ─────────────────────────────────────────────────────────
export const DayTheme: ThemeTokens = {
  bg:               '#0c1a12',
  surface:          '#132318',
  surfaceHighlight: '#1c3024',
  gold:             '#c8a84b',
  accent:           '#5fbf8a',
  accentSoft:       '#9ecfb0',
  text:             '#d4e8d4',
  textMuted:        '#6a9678',
  textInverse:      '#0c1a12',
  success:          '#5fbf8a',
  warning:          '#c8a84b',
  danger:           '#c06a5a',
  phaseRgb:         '95,191,138',
  border:           '#283d2f',
};

// ── GOLDEN HOUR (17:00–20:00) ─────────────────────────────────────────────────
export const GoldenHourTheme: ThemeTokens = {
  bg:               '#120e06',
  surface:          '#1e1608',
  surfaceHighlight: '#2c200e',
  gold:             '#e8c56a',
  accent:           '#d4956a',
  accentSoft:       '#b87340',
  text:             '#f5e6c8',
  textMuted:        '#a88050',
  textInverse:      '#120e06',
  success:          '#7fc9c9',
  warning:          '#e8c56a',
  danger:           '#ff6b6b',
  phaseRgb:         '212,149,106',
  border:           '#3d2e14',
};

// ── NIGHT (20:00–05:00) ───────────────────────────────────────────────────────
export const NightTheme: ThemeTokens = {
  bg:               '#0e0c14',
  surface:          '#1a1625',
  surfaceHighlight: '#252236',
  gold:             '#e8c56a',
  accent:           '#7fc9c9',
  accentSoft:       '#9b6dff',
  text:             '#f0e6ff',
  textMuted:        '#a89bb8',
  textInverse:      '#0e0c14',
  success:          '#7fc9c9',
  warning:          '#e8c56a',
  danger:           '#ff6b6b',
  phaseRgb:         '127,201,201',
  border:           '#302d44',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
export type CircadianPhase = 'dawn' | 'day' | 'goldenHour' | 'night';

export function themeForPhase(phase: CircadianPhase): ThemeTokens {
  switch (phase) {
    case 'dawn':       return DawnTheme;
    case 'day':        return DayTheme;
    case 'goldenHour': return GoldenHourTheme;
    case 'night':      return NightTheme;
    default:           return NightTheme;
  }
}

// Legacy aliases — bridge.tsx and any old imports
export const MidnightGarden = NightTheme;

export function getPhasePair(phase: CircadianPhase): [ThemeTokens, ThemeTokens] {
  switch (phase) {
    case 'dawn':       return [NightTheme,     DawnTheme];
    case 'day':        return [DawnTheme,       DayTheme];
    case 'goldenHour': return [DayTheme,        GoldenHourTheme];
    case 'night':      return [GoldenHourTheme, NightTheme];
    default:           return [NightTheme,      NightTheme];
  }
}
