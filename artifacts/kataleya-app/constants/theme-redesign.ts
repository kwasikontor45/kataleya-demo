// ============================================================
// KATALEYA — THEME REDESIGN v2.5
// Replaces white MorningBloom with a warm deep-forest palette.
// Four distinct phases: dawn / day / golden-hour / night
// All fully dark — no bright whites at any time of day.
// ============================================================

// ── FILE: constants/theme.ts ─────────────────────────────────────────────────

export interface ThemeTokens {
  bg: string;
  surface: string;
  surface-highlight: string;
  gold: string;
  accent: string;
  accent-soft: string;
  text: string;
  text-muted: string;
  text-inverse: string;
  success: string;
  warning: string;
  danger: string;
  // NEW: phase-specific glow for NeonCard
  phase-rgb: string; // RGB triplet for rgba() usage
}

// ── DAWN (05:00–08:00)
// Mood: quiet emergence. Deep blue-slate waking into rose.
// Replaces: MorningBloom white (#faf8f5) → deep slate (#0d1117)
export const DawnTheme: ThemeTokens = {
  bg:               '#0d1117', // deep blue-slate
  surface:          '#161c27', // lifted surface
  'surface-highlight': '#1e2535',
  gold:             '#d4876b', // muted terracotta — dawn warmth
  accent:           '#8fb3cc', // soft steel blue
  'accent-soft':    '#c9a27a', // warm amber-rose
  text:             '#dce6f0', // cool white
  'text-muted':     '#7a95ae', // muted blue-grey
  'text-inverse':   '#0d1117',
  success:          '#5ba88a',
  warning:          '#c9a27a',
  danger:           '#c06a5a',
  'phase-rgb':      '141,179,204', // accent blue
};

// ── DAY (08:00–17:00)
// Mood: grounded, alive, botanical. Deep forest green — NOT white.
// Replaces: MorningBloom white (#faf8f5) → forest floor (#0c1a12)
export const DayTheme: ThemeTokens = {
  bg:               '#0c1a12', // deep forest floor
  surface:          '#132318', // lifted foliage
  'surface-highlight': '#1c3024',
  gold:             '#c8a84b', // warm sunlight gold
  accent:           '#5fbf8a', // fresh sage green
  'accent-soft':    '#9ecfb0', // soft mint
  text:             '#d4e8d4', // pale leaf
  'text-muted':     '#6a9678', // mossy grey-green
  'text-inverse':   '#0c1a12',
  success:          '#5fbf8a',
  warning:          '#c8a84b',
  danger:           '#c06a5a',
  'phase-rgb':      '95,191,138', // sage green
};

// ── GOLDEN HOUR (17:00–20:00) — unchanged, already strong
export const GoldenHourTheme: ThemeTokens = {
  bg:               '#120e06', // deep ember
  surface:          '#1e1608',
  'surface-highlight': '#2c200e',
  gold:             '#e8c56a', // candlelight
  accent:           '#d4956a', // warm amber
  'accent-soft':    '#b87340',
  text:             '#f5e6c8',
  'text-muted':     '#a88050',
  'text-inverse':   '#120e06',
  success:          '#7fc9c9',
  warning:          '#e8c56a',
  danger:           '#ff6b6b',
  'phase-rgb':      '232,197,106', // gold
};

// ── NIGHT (20:00–05:00) — unchanged, already strong
export const NightTheme: ThemeTokens = {
  bg:               '#0e0c14', // deep indigo-black
  surface:          '#1a1625',
  'surface-highlight': '#252236',
  gold:             '#e8c56a', // candlelight
  accent:           '#7fc9c9', // bioluminescent cyan
  'accent-soft':    '#9b6dff', // soft violet
  text:             '#f0e6ff',
  'text-muted':     '#a89bb8',
  'text-inverse':   '#0e0c14',
  success:          '#7fc9c9',
  warning:          '#e8c56a',
  danger:           '#ff6b6b',
  'phase-rgb':      '127,201,201', // cyan
};

// ── Blend interpolation unchanged — useAnimatedTheme drives colors
// between DawnTheme and DayTheme (blend 0–0.5) and
// DayTheme and GoldenHourTheme (blend 0.5–1.0)
// See hooks/useAnimatedTheme.ts


// ── FILE: hooks/useAnimatedTheme.ts (updated) ────────────────────────────────

import { useDerivedValue, useAnimatedStyle, interpolateColor } from 'react-native-reanimated';
import { useCircadian } from './useCircadian';
import { DawnTheme, DayTheme, GoldenHourTheme, NightTheme, ThemeTokens } from '@/constants/theme';

// Returns the TWO themes to blend between based on current phase
function getPhasePair(phase: string): [ThemeTokens, ThemeTokens] {
  switch (phase) {
    case 'dawn':       return [NightTheme, DawnTheme];
    case 'day':        return [DawnTheme, DayTheme];
    case 'goldenHour': return [DayTheme, GoldenHourTheme];
    case 'night':      return [GoldenHourTheme, NightTheme];
    default:           return [DayTheme, DayTheme];
  }
}

export function useAnimatedTheme() {
  const { blendValue, phase } = useCircadian();
  const [from, to] = getPhasePair(phase);

  const bg = useDerivedValue(() =>
    interpolateColor(blendValue.value, [0, 1], [from.bg, to.bg])
  );
  const surface = useDerivedValue(() =>
    interpolateColor(blendValue.value, [0, 1], [from.surface, to.surface])
  );
  const gold = useDerivedValue(() =>
    interpolateColor(blendValue.value, [0, 1], [from.gold, to.gold])
  );
  const accent = useDerivedValue(() =>
    interpolateColor(blendValue.value, [0, 1], [from.accent, to.accent])
  );
  const text = useDerivedValue(() =>
    interpolateColor(blendValue.value, [0, 1], [from.text, to.text])
  );
  const textMuted = useDerivedValue(() =>
    interpolateColor(blendValue.value, [0, 1], [from['text-muted'], to['text-muted']])
  );

  // Animated styles for drop-in use
  const bgStyle = useAnimatedStyle(() => ({ backgroundColor: bg.value }));
  const surfaceStyle = useAnimatedStyle(() => ({ backgroundColor: surface.value }));
  const goldTextStyle = useAnimatedStyle(() => ({ color: gold.value }));
  const accentTextStyle = useAnimatedStyle(() => ({ color: accent.value }));
  const textStyle = useAnimatedStyle(() => ({ color: text.value }));

  // Snapshot of current phase tokens (for non-animated use)
  const theme = phase === 'dawn' ? DawnTheme
              : phase === 'goldenHour' ? GoldenHourTheme
              : phase === 'night' ? NightTheme
              : DayTheme;

  return {
    colors: { bg, surface, gold, accent, text, textMuted },
    styles: { bg: bgStyle, surface: surfaceStyle, goldText: goldTextStyle, accentText: accentTextStyle, text: textStyle },
    theme, // current static token set for NeonCard accentRgb etc.
  };
}


// ── FILE: app/onboarding.tsx (updated — no emojis, SVG icons) ────────────────
// Each onboarding step gets an SVG icon component that follows theme colors.

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  Dimensions, TextInput,
} from 'react-native';
import Svg, { Circle, Path, Rect, G, Line, Ellipse } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useAnimatedTheme } from '@/hooks/useAnimatedTheme';
import { Surface, Fortress } from '@/utils/storage';

const { width } = Dimensions.get('window');

// ── SVG Icon Components — no emojis, follow theme accent color ───────────────

// Step 0: Welcome — the ..: :.. Knowledge Bridge sigil
const IconKnowledgeBridge = ({ color = '#7fc9c9', size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    {/* Outer dots pulse outward */}
    <Circle cx={10} cy={32} r={5} fill={color} opacity={0.9} />
    <Circle cx={18} cy={32} r={4} fill={color} opacity={0.6} />
    {/* Center colons */}
    <Circle cx={27} cy={24} r={3.5} fill={color} />
    <Circle cx={27} cy={40} r={3.5} fill={color} />
    <Circle cx={37} cy={24} r={3.5} fill={color} />
    <Circle cx={37} cy={40} r={3.5} fill={color} />
    {/* Outer dots */}
    <Circle cx={46} cy={32} r={4} fill={color} opacity={0.6} />
    <Circle cx={54} cy={32} r={5} fill={color} opacity={0.9} />
    {/* Horizontal scan line */}
    <Line x1={4} y1={32} x2={60} y2={32} stroke={color} strokeWidth={0.5} opacity={0.2} />
  </Svg>
);

// Step 1: Name — minimal person silhouette
const IconPerson = ({ color = '#7fc9c9', size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    {/* Head */}
    <Circle cx={32} cy={18} r={10} fill="none" stroke={color} strokeWidth={2} />
    {/* Shoulders */}
    <Path
      d="M12 54 C12 38 20 32 32 32 C44 32 52 38 52 54"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    {/* Subtle inner dot */}
    <Circle cx={32} cy={18} r={3} fill={color} opacity={0.4} />
  </Svg>
);

// Step 2: Substance / recovery — two paths converging (divergence becoming unity)
const IconRecovery = ({ color = '#7fc9c9', size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    {/* Left path — jagged/difficult */}
    <Path
      d="M8 52 L14 38 L20 44 L26 28 L32 32"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.5}
    />
    {/* Right path — smooth/emerging */}
    <Path
      d="M32 32 L40 26 L50 20 L58 12"
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
    />
    {/* Junction point */}
    <Circle cx={32} cy={32} r={4} fill={color} />
    {/* Growth tip */}
    <Circle cx={58} cy={12} r={3} fill={color} opacity={0.7} />
  </Svg>
);

// Step 3: Sobriety date — minimal calendar / orbital clock
const IconClock = ({ color = '#7fc9c9', size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    {/* Outer ring */}
    <Circle cx={32} cy={32} r={24} fill="none" stroke={color} strokeWidth={2} opacity={0.4} />
    {/* Inner ring */}
    <Circle cx={32} cy={32} r={16} fill="none" stroke={color} strokeWidth={1} opacity={0.3} />
    {/* Center dot */}
    <Circle cx={32} cy={32} r={3} fill={color} />
    {/* Hour hand */}
    <Line x1={32} y1={32} x2={32} y2={14} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    {/* Minute hand */}
    <Line x1={32} y1={32} x2={46} y2={32} stroke={color} strokeWidth={2} strokeLinecap="round" />
    {/* Tick marks at 12, 3, 6, 9 */}
    <Line x1={32} y1={8} x2={32} y2={12} stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.6} />
    <Line x1={56} y1={32} x2={52} y2={32} stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.6} />
    <Line x1={32} y1={56} x2={32} y2={52} stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.6} />
    <Line x1={8} y1={32} x2={12} y2={32} stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.6} />
  </Svg>
);

// Step 4: Privacy — vault / lock geometry
const IconVault = ({ color = '#7fc9c9', size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    {/* Outer shield */}
    <Path
      d="M32 6 L54 16 L54 36 C54 48 44 56 32 60 C20 56 10 48 10 36 L10 16 Z"
      fill="none"
      stroke={color}
      strokeWidth={2}
      opacity={0.5}
    />
    {/* Inner lock body */}
    <Rect x={24} y={30} width={16} height={14} rx={3} fill="none" stroke={color} strokeWidth={2} />
    {/* Lock shackle */}
    <Path
      d="M28 30 L28 24 Q28 18 32 18 Q36 18 36 24 L36 30"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    {/* Keyhole */}
    <Circle cx={32} cy={36} r={2.5} fill={color} />
    <Rect x={30.5} y={36} width={3} height={5} rx={1} fill={color} />
  </Svg>
);

// Step 5: Notifications — minimal bell geometry
const IconBell = ({ color = '#7fc9c9', size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    {/* Bell body */}
    <Path
      d="M20 42 L20 28 Q20 16 32 14 Q44 16 44 28 L44 42 Z"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinejoin="round"
    />
    {/* Bell base bar */}
    <Line x1={16} y1={42} x2={48} y2={42} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    {/* Clapper */}
    <Circle cx={32} cy={48} r={3} fill="none" stroke={color} strokeWidth={2} />
    {/* Small hanger at top */}
    <Circle cx={32} cy={13} r={2.5} fill="none" stroke={color} strokeWidth={1.5} />
    {/* Subtle ring emanating */}
    <Path
      d="M14 20 Q10 28 14 36"
      fill="none"
      stroke={color}
      strokeWidth={1}
      strokeLinecap="round"
      opacity={0.35}
    />
    <Path
      d="M50 20 Q54 28 50 36"
      fill="none"
      stroke={color}
      strokeWidth={1}
      strokeLinecap="round"
      opacity={0.35}
    />
  </Svg>
);

// Step 6: Enter — the orchid / GhostPulseOrb glyph
const IconOrchid = ({ color = '#7fc9c9', size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    {/* Three concentric rings at different opacities */}
    <Circle cx={32} cy={32} r={28} fill="none" stroke={color} strokeWidth={0.8} opacity={0.12} />
    <Circle cx={32} cy={32} r={20} fill="none" stroke={color} strokeWidth={1} opacity={0.2} />
    <Circle cx={32} cy={32} r={13} fill="none" stroke={color} strokeWidth={1.5} opacity={0.35} />
    {/* Core ⟡ glyph — diamond */}
    <Path
      d="M32 20 L40 32 L32 44 L24 32 Z"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
      opacity={0.8}
    />
    {/* Inner diamond */}
    <Path
      d="M32 26 L36 32 L32 38 L28 32 Z"
      fill={color}
      opacity={0.6}
    />
    {/* Stem */}
    <Line x1={32} y1={44} x2={32} y2={56} stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
  </Svg>
);

// ── Step config ───────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'welcome',      label: 'a sanctuary that\nbreathes with you',    Icon: IconKnowledgeBridge },
  { id: 'name',         label: 'what should we\ncall you?',              Icon: IconPerson },
  { id: 'substance',    label: 'what are you\nrecovering from?',         Icon: IconRecovery },
  { id: 'sobriety_date',label: 'when did you\nbegin?',                   Icon: IconClock },
  { id: 'privacy',      label: 'your data never\nleaves this device',    Icon: IconVault },
  { id: 'notifications',label: 'gentle reminders\nwhen you need them',   Icon: IconBell },
  { id: 'enter',        label: 'the garden\nis ready',                   Icon: IconOrchid },
] as const;

const SUBSTANCE_OPTIONS = [
  'Alcohol',
  'Substances',
  'Behavior',
  'Other / Prefer not to say',
];

// ── Onboarding screen ─────────────────────────────────────────────────────────

export default function Onboarding() {
  const router = useRouter();
  const { theme, colors } = useAnimatedTheme();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [substance, setSubstance] = useState('');

  // Dot progress animation
  const dotAnim = useRef(new Animated.Value(0)).current;

  const accentColor = theme.accent;
  const goldColor   = theme.gold;

  const advance = () => {
    if (step < STEPS.length - 1) {
      Animated.spring(dotAnim, { toValue: step + 1, useNativeDriver: false }).start();
      setStep(s => s + 1);
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    await Surface.set('HAS_COMPLETED_ONBOARDING', 'true');
    if (name.trim()) await Surface.set('USER_NAME', name.trim());
    router.replace('/bridge');
  };

  const { id, label, Icon } = STEPS[step];

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>

      {/* Progress dots */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === step ? accentColor : theme['text-muted'],
                width:  i === step ? 20 : 6,
                opacity: i <= step ? 1 : 0.3,
              }
            ]}
          />
        ))}
      </View>

      {/* Icon */}
      <View style={styles.icon-wrap}>
        <Icon color={accentColor} size={72} />
      </View>

      {/* Label */}
      <Text style={[styles.label, { color: theme.text, fontFamily: 'CourierPrime' }]}>
        {label}
      </Text>

      {/* Step-specific content */}
      <View style={styles.content}>
        {id === 'name' && (
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="name or nickname"
            placeholderTextColor={theme['text-muted']}
            style={[styles.input, {
              color: theme.text,
              borderColor: accentColor,
              backgroundColor: theme.surface,
              fontFamily: 'CourierPrime',
            }]}
            autoFocus
          />
        )}

        {id === 'substance' && (
          <View style={styles.options}>
            {SUBSTANCE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                onPress={() => { setSubstance(opt); advance(); }}
                style={[styles.option, {
                  borderColor: substance === opt ? accentColor : theme['text-muted'],
                  backgroundColor: substance === opt
                    ? `rgba(${theme['phase-rgb']}, 0.1)`
                    : theme.surface,
                }]}
              >
                <Text style={[styles.option-text, {
                  color: substance === opt ? accentColor : theme['text-muted'],
                  fontFamily: 'CourierPrime',
                }]}>
                  {opt.toLowerCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {id === 'privacy' && (
          <View style={styles.privacy-badges}>
            {[
              ['fortress', 'hardware-encrypted keys'],
              ['sanctuary', 'local SQLite only'],
              ['surface', 'ui preferences'],
            ].map(([vault, desc]) => (
              <View key={vault} style={[styles.badge, {
                borderColor: `rgba(${theme['phase-rgb']}, 0.3)`,
                backgroundColor: `rgba(${theme['phase-rgb']}, 0.06)`,
              }]}>
                <Text style={[styles.badge-vault, { color: accentColor, fontFamily: 'CourierPrime' }]}>
                  {vault}
                </Text>
                <Text style={[styles.badge-desc, { color: theme['text-muted'], fontFamily: 'CourierPrime' }]}>
                  {desc}
                </Text>
              </View>
            ))}
            <Text style={[styles.privacy-note, { color: theme['text-muted'], fontFamily: 'CourierPrime' }]}>
              we physically cannot access your data.
            </Text>
          </View>
        )}
      </View>

      {/* CTA — skip for substance (auto-advances on tap) */}
      {id !== 'substance' && (
        <TouchableOpacity
          onPress={advance}
          style={[styles.cta, {
            borderColor: accentColor,
            backgroundColor: `rgba(${theme['phase-rgb']}, 0.08)`,
          }]}
        >
          <Text style={[styles.cta-text, { color: accentColor, fontFamily: 'CourierPrime' }]}>
            {id === 'enter' ? 'enter sanctuary' : 'continue'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Step counter */}
      <Text style={[styles.counter, { color: theme['text-muted'], fontFamily: 'CourierPrime' }]}>
        {step + 1} / {STEPS.length}
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    position: 'absolute',
    top: 64,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },
  'icon-wrap': {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 22,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 32,
    textTransform: 'lowercase',
    letterSpacing: 0.5,
  },
  content: {
    width: '100%',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    textAlign: 'center',
  },
  options: {
    gap: 10,
  },
  option: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  'option-text': {
    fontSize: 15,
    letterSpacing: 0.3,
  },
  'privacy-badges': {
    gap: 10,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  'badge-vault': {
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    minWidth: 80,
  },
  'badge-desc': {
    fontSize: 13,
    flex: 1,
  },
  'privacy-note': {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  cta: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    marginBottom: 16,
  },
  'cta-text': {
    fontSize: 15,
    letterSpacing: 1.5,
    textTransform: 'lowercase',
  },
  counter: {
    fontSize: 12,
    letterSpacing: 2,
    opacity: 0.5,
  },
});
