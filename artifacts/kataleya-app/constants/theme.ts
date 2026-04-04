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

// Dawn / day — warm parchment (unchanged)
export const MorningBloom: ThemeTokens = {
  bg:               '#e8ddd0',
  surface:          '#f0e8dc',
  surfaceHighlight: '#e0d4c4',
  gold:             '#a06808',
  accent:           '#a04510',
  accentSoft:       '#9a7210',
  text:             '#1a100a',
  textMuted:        '#4a3525',
  textInverse:      '#faf8f5',
  success:          '#1f7a6e',
  warning:          '#9a7210',
  danger:           '#c0401e',
  border:           '#c4a888',
};

// Golden hour → night — merged HTML navy+sage+terra palette
// HTML --bg-dark #1a1a2e, --primary-sage #87a878, --primary-terra #d4a373
// --safe #81b29a, --danger #e07a5f, --warning #f2cc8f
export const MidnightGarden: ThemeTokens = {
  bg:               '#1a1a2e',   // HTML --bg-dark       (was #0e0c14)
  surface:          '#16213e',   // HTML gradient end    (was #1a1625)
  surfaceHighlight: '#1e2a4a',   // one step lighter
  gold:             '#d4a373',   // HTML --primary-terra (was #e8c56a)
  accent:           '#87a878',   // HTML --primary-sage  (was #7fc9c9)
  accentSoft:       '#81b29a',   // HTML --safe          (was #9b6dff)
  text:             '#f5f5f5',   // HTML --text-primary  (was #f0e6ff)
  textMuted:        '#a0a0a0',   // HTML --text-secondary (was #a89bb8)
  textInverse:      '#1a1a2e',
  success:          '#81b29a',   // HTML --safe
  warning:          '#f2cc8f',   // HTML --warning
  danger:           '#e07a5f',   // HTML --danger        (was #ff6b6b)
  border:           '#1e2a4a',   // deep navy            (was #2a2440)
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
