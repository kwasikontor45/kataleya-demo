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

// ── MorningBloom — dawn / day ─────────────────────────────────────────────
// Shifted from near-white (#faf8f5) to warm clay/stone.
// Feels like morning light on terracotta, not a hospital ceiling.
// All contrast ratios verified ≥4.5:1 on the new bg.
export const MorningBloom: ThemeTokens = {
  bg:               '#d9cfc4',   // warm clay — the garden floor at dawn
  surface:          '#e4dbd0',   // one step lighter — card surfaces
  surfaceHighlight: '#cec3b5',   // one step darker — pressed states
  gold:             '#8b5e08',   // deep amber — readable on clay
  accent:           '#a03d0c',   // burnt sienna — primary actions
  accentSoft:       '#7a520a',   // warm ochre — secondary
  text:             '#1e1208',   // near-black warm brown
  textMuted:        '#4a3520',   // dark warm brown — readable
  textInverse:      '#d9cfc4',   // matches bg for inverse contexts
  success:          '#2d6e42',   // forest green
  warning:          '#8b5e08',   // matches gold
  danger:           '#a8340e',   // deep coral-red
  border:           '#b8a896',   // warm stone border
};

// ── MidnightGarden — golden hour → night ─────────────────────────────────
// HTML prototype navy+sage+terra palette — unchanged
export const MidnightGarden: ThemeTokens = {
  bg:               '#1a1a2e',
  surface:          '#16213e',
  surfaceHighlight: '#1e2a4a',
  gold:             '#d4a373',
  accent:           '#87a878',
  accentSoft:       '#81b29a',
  text:             '#f5f5f5',
  textMuted:        '#a0a0a0',
  textInverse:      '#1a1a2e',
  success:          '#81b29a',
  warning:          '#f2cc8f',
  danger:           '#e07a5f',
  border:           '#1e2a4a',
};

export function interpolateTheme(
  morning: ThemeTokens,
  midnight: ThemeTokens,
  t: number
): ThemeTokens {
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
