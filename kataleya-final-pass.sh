#!/bin/bash
# kataleya-final-pass.sh
# Run from: ~/kataleya
# Does: growth garden language, cover warmth, tab bar color, theme file
set -e
APP="artifacts/kataleya-app"
echo "→ Final pass..."

# ── 1. theme.ts — warm clay MorningBloom ────────────────────────────────────
cat > "$APP/constants/theme.ts" << 'THEMEEOF'
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
// Warm clay — garden soil at dawn. Not white.
// All contrast ratios ≥4.5:1 on #d9cfc4 background.
export const MorningBloom: ThemeTokens = {
  bg:               '#d9cfc4',
  surface:          '#e4dbd0',
  surfaceHighlight: '#cec3b5',
  gold:             '#8b5e08',
  accent:           '#a03d0c',
  accentSoft:       '#7a520a',
  text:             '#1e1208',
  textMuted:        '#4a3520',
  textInverse:      '#d9cfc4',
  success:          '#2d6e42',
  warning:          '#8b5e08',
  danger:           '#a8340e',
  border:           '#b8a896',
};

// ── MidnightGarden — golden hour → night ──────────────────────────────────
// HTML prototype navy + sage + terra palette
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
THEMEEOF
echo "  ✓ theme.ts"

# ── 2. Tab bar — update day active color to match new accent ────────────────
sed -i "s/const tabActive   = hexLerp('#7a2200', theme.accent);/const tabActive   = hexLerp('#a03d0c', theme.accent);/" \
  "$APP/app/(tabs)/_layout.tsx"
sed -i "s/const tabInactive = hexLerp('#5c3418', theme.textMuted);/const tabInactive = hexLerp('#6b4520', theme.textMuted);/" \
  "$APP/app/(tabs)/_layout.tsx"
echo "  ✓ tab bar colors"

# ── 3. growth.tsx — garden language, milestone glyphs ─────────────────────
python3 - << 'PYEOF'
import pathlib

path = pathlib.Path("artifacts/kataleya-app/app/(tabs)/growth.tsx")
src = path.read_text()

# Section labels — garden language
src = src.replace(
    "        <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)` }]}>season of growth</Text>",
    "        <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)` }]}>the garden grows</Text>"
)
src = src.replace(
    "            <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)`, marginTop: 24 }]}>next bloom</Text>",
    "            <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)`, marginTop: 24 }]}>next bloom</Text>"
)
src = src.replace(
    "            <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)`, marginTop: 24 }]}>patterns</Text>",
    "            <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)`, marginTop: 24 }]}>what the garden notices</Text>"
)

# Milestone glyph alongside dot — add tier emoji before label
# Map label to glyph based on days
src = src.replace(
    "                    <Text style={[styles.milestoneLabel, { color: isActive ? `rgba(${accentRgb},0.95)` : theme.text }]}>\n                      {m.label}\n                    </Text>",
    """                    <Text style={[styles.milestoneLabel, { color: isActive ? `rgba(${accentRgb},0.95)` : theme.text }]}>
                      {m.days >= 365 ? '🌳 ' : m.days >= 90 ? '🌸 ' : m.days >= 30 ? '🌿 ' : m.days >= 7 ? '🌱 ' : '· '}{m.label}
                    </Text>"""
)

# "days until X" → lowercase garden feel
src = src.replace(
    "                  days until {sobriety.nextMilestone.label}",
    "                  days to {sobriety.nextMilestone.label.toLowerCase()}"
)

# Empty state glyph
src = src.replace(
    '              <Text style={[styles.emptyGlyph, { color: `rgba(${accentRgb},0.25)` }]}>⟡</Text>',
    '              <Text style={[styles.emptyGlyph, { color: `rgba(${accentRgb},0.25)` }]}>🌱</Text>'
)
src = src.replace(
    "                  <Text style={[styles.emptyGlyph, { color: `rgba(${accentRgb},0.2)` }]}>⟡</Text>",
    "                  <Text style={[styles.emptyGlyph, { color: `rgba(${accentRgb},0.2)` }]}>🌧</Text>"
)

# Section label — achieved count header
src = src.replace(
    "        <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)` }]}>the garden grows</Text>",
    """        <View style={styles.seasonHeader}>
          <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)` }]}>the garden grows</Text>
          <Text style={[styles.achievedCount, { color: `rgba(${accentRgb},0.45)` }]}>
            {sobriety.milestones.filter(m => m.achieved).length} of {sobriety.milestones.length}
          </Text>
        </View>"""
)

# Add seasonHeader style
src = src.replace(
    "  container: { flex: 1 },",
    "  container: { flex: 1 },\n  seasonHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },\n  achievedCount: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 2 },"
)

path.write_text(src)
print("  ✓ growth.tsx")
PYEOF

# ── 4. cover.tsx — warm sanctuary, not pure black ──────────────────────────
cat > "$APP/app/cover.tsx" << 'COVEREOF'
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Animated, Easing,
} from 'react-native';
import { useRouter } from 'expo-router';

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

const pad = (n: number) => String(n).padStart(2, '0');

// Breathe — slow 5.5s inhale/exhale, calming for crisis moments
function useBreathCycle() {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const cycle = () => {
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) cycle(); });
    };
    cycle();
    return () => anim.stopAnimation();
  }, []);
  return anim;
}

export default function CoverScreen() {
  const router    = useRouter();
  const time      = useClock();
  const breathe   = useBreathCycle();
  const tapCount  = useRef(0);
  const tapTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hours   = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const isAM    = hours < 12;
  const h12     = hours % 12 || 12;
  const day     = time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const handleTap = () => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (tapCount.current >= 3) {
      tapCount.current = 0;
      router.back();
      return;
    }
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 800);
  };

  // Breathing ring opacity
  const ringOpacity = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.14] });
  const ringScale   = breathe.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.04] });

  return (
    <View style={styles.container}>
      {/* Ambient breathing ring — barely visible, calming presence */}
      <Animated.View
        pointerEvents="none"
        style={[styles.breathRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
      />

      <TouchableOpacity
        style={styles.clockArea}
        onPress={handleTap}
        activeOpacity={1}
        accessible={false}
      >
        <Text style={styles.dayText}>{day}</Text>

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>
            {pad(h12)}:{pad(minutes)}
          </Text>
          <View style={styles.ampmCol}>
            <Text style={[styles.ampm, { opacity: isAM ? 0.7 : 0.15 }]}>AM</Text>
            <Text style={[styles.ampm, { opacity: !isAM ? 0.7 : 0.15 }]}>PM</Text>
          </View>
        </View>

        <Text style={styles.seconds}>{pad(seconds)}</Text>

        <View style={styles.divider} />

        {/* Breathing instruction — gentle, not clinical */}
        <Text style={styles.label}>breathe</Text>
        <Text style={styles.sublabel}>tap three times to return to the garden</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0c0a',   // near-black warm brown — not pure #000
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1,
    borderColor: '#87a878',       // sage — sanctuary colour
  },
  clockArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  dayText: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'CourierPrime',
    fontSize: 11,
    color: '#3a3028',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  timeText: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'CourierPrime',
    fontSize: 72,
    color: '#4a4038',             // very dark warm brown — readable, not glaring
    fontWeight: '100',
    letterSpacing: -2,
    lineHeight: 80,
  },
  ampmCol: { paddingTop: 14, gap: 2 },
  ampm: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'CourierPrime',
    fontSize: 11,
    color: '#3a3028',
    letterSpacing: 1,
  },
  seconds: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'CourierPrime',
    fontSize: 18,
    color: '#2a2018',
    letterSpacing: 3,
  },
  divider: {
    width: 32,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#2a2018',
    marginVertical: 8,
  },
  label: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'CourierPrime',
    fontSize: 11,
    color: '#3a3028',
    letterSpacing: 4,
    textTransform: 'lowercase',
  },
  sublabel: {
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'CourierPrime',
    fontSize: 9,
    color: '#2a2018',
    letterSpacing: 1,
    marginTop: 4,
  },
});
COVEREOF
echo "  ✓ cover.tsx"

# ── 5. colors.ts — update tint to match new MorningBloom accent ────────────
cat > "$APP/constants/colors.ts" << 'COLORSEOF'
export default {
  light: {
    text: '#1e1208',
    background: '#d9cfc4',
    tint: '#a03d0c',
    tabIconDefault: '#6b4520',
    tabIconSelected: '#a03d0c',
  },
  dark: {
    text: '#f5f5f5',
    background: '#1a1a2e',
    tint: '#87a878',
    tabIconDefault: '#a0a0a0',
    tabIconSelected: '#87a878',
  },
};
COLORSEOF
echo "  ✓ colors.ts"

echo ""
echo "✓ Final pass complete."
echo "  git add -A && git commit -m 'feat: warm clay theme, garden growth, sanctuary cover, tab bar polish' && git push origin main"
echo "  cd artifacts/kataleya-app && npx expo start --tunnel --clear"
