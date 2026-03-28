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
  border: string;
}

export const MorningBloom: ThemeTokens = {
  bg: '#faf8f5',
  surface: '#ffffff',
  surfaceHighlight: '#f5f0e8',
  gold: '#a06808',          // was #c8860a — darkened for contrast on light bg
  accent: '#b85510',        // was #f4a261 (2.3:1) — now ~4.6:1, AA-compliant
  accentSoft: '#9a7210',    // was #e9c46a (1.6:1) — now ~6:1
  text: '#2a1810',
  textMuted: '#6b5540',     // was #8b7355 (4.5:1 borderline) — now ~6.2:1
  textInverse: '#faf8f5',
  success: '#1f7a6e',       // was #2a9d8f — darkened to match new contrast standard
  warning: '#9a7210',       // was #e9c46a — matches accentSoft
  danger: '#c0401e',        // was #e76f51 — darkened for contrast on light bg
  border: '#d0c0a8',        // was #e8ddd0 — more visible separation
};

export const MidnightGarden: ThemeTokens = {
  bg: '#0e0c14',
  surface: '#1a1625',
  surfaceHighlight: '#252236',
  gold: '#e8c56a',
  accent: '#7fc9c9',
  accentSoft: '#9b6dff',
  text: '#f0e6ff',
  textMuted: '#a89bb8',
  textInverse: '#0e0c14',
  success: '#7fc9c9',
  warning: '#e8c56a',
  danger: '#ff6b6b',
  border: '#2a2440',
};

export function interpolateTheme(morning: ThemeTokens, midnight: ThemeTokens, t: number): ThemeTokens {
  const lerp = (a: string, b: string, t: number): string => {
    const parseHex = (hex: string) => {
      const n = parseInt(hex.replace('#', ''), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const toHex = (r: number, g: number, b: number) =>
      '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    const [r1, g1, b1] = parseHex(a);
    const [r2, g2, b2] = parseHex(b);
    return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
  };

  const keys = Object.keys(morning) as (keyof ThemeTokens)[];
  return keys.reduce((acc, key) => {
    acc[key] = lerp(morning[key], midnight[key], t);
    return acc;
  }, {} as ThemeTokens);
}
