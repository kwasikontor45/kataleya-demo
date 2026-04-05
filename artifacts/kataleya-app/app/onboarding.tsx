// app/onboarding.tsx
// Fixed: no hyphenated style keys, no hyphenated ThemeTokens references.
// All theme property access uses camelCase (textMuted, phaseRgb, etc.)

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, TouchableOpacity,
  Dimensions, TextInput,
} from 'react-native';
import Svg, { Circle, Path, Line, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useAnimatedTheme } from '@/hooks/useAnimatedTheme';
import { Surface } from '@/utils/storage';

const { width } = Dimensions.get('window');

// ── SVG Icons — no emojis, theme-colored ─────────────────────────────────────

const IconBridge = ({ color = '#7fc9c9', size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Circle cx={10} cy={32} r={5} fill={color} opacity={0.9} />
    <Circle cx={18} cy={32} r={3.5} fill={color} opacity={0.55} />
    <Circle cx={27} cy={24} r={3.5} fill={color} />
    <Circle cx={27} cy={40} r={3.5} fill={color} />
    <Circle cx={37} cy={24} r={3.5} fill={color} />
    <Circle cx={37} cy={40} r={3.5} fill={color} />
    <Circle cx={46} cy={32} r={3.5} fill={color} opacity={0.55} />
    <Circle cx={54} cy={32} r={5} fill={color} opacity={0.9} />
    <Line x1={4} y1={32} x2={60} y2={32} stroke={color} strokeWidth={0.5} opacity={0.15} />
  </Svg>
);

const IconPerson = ({ color = '#7fc9c9', size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Circle cx={32} cy={18} r={10} fill="none" stroke={color} strokeWidth={2} />
    <Path d="M12 54 C12 38 20 32 32 32 C44 32 52 38 52 54"
      fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Circle cx={32} cy={18} r={3} fill={color} opacity={0.4} />
  </Svg>
);

const IconRecovery = ({ color = '#7fc9c9', size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Path d="M8 52 L14 38 L20 44 L26 28 L32 32"
      fill="none" stroke={color} strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" opacity={0.45} />
    <Path d="M32 32 L40 26 L50 20 L58 12"
      fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    <Circle cx={32} cy={32} r={4} fill={color} />
    <Circle cx={58} cy={12} r={3} fill={color} opacity={0.65} />
  </Svg>
);

const IconClock = ({ color = '#7fc9c9', size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Circle cx={32} cy={32} r={24} fill="none" stroke={color} strokeWidth={2} opacity={0.35} />
    <Circle cx={32} cy={32} r={16} fill="none" stroke={color} strokeWidth={1} opacity={0.25} />
    <Circle cx={32} cy={32} r={3} fill={color} />
    <Line x1={32} y1={32} x2={32} y2={14} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    <Line x1={32} y1={32} x2={46} y2={32} stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Line x1={32} y1={8}  x2={32} y2={12} stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.6} />
    <Line x1={56} y1={32} x2={52} y2={32} stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.6} />
    <Line x1={32} y1={56} x2={32} y2={52} stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.6} />
    <Line x1={8}  y1={32} x2={12} y2={32} stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.6} />
  </Svg>
);

const IconVault = ({ color = '#7fc9c9', size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Path d="M32 6 L54 16 L54 36 C54 48 44 56 32 60 C20 56 10 48 10 36 L10 16 Z"
      fill="none" stroke={color} strokeWidth={2} opacity={0.45} />
    <Rect x={24} y={30} width={16} height={14} rx={3} fill="none" stroke={color} strokeWidth={2} />
    <Path d="M28 30 L28 24 Q28 18 32 18 Q36 18 36 24 L36 30"
      fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Circle cx={32} cy={36} r={2.5} fill={color} />
    <Rect x={30.5} y={36} width={3} height={5} rx={1} fill={color} />
  </Svg>
);

const IconBell = ({ color = '#7fc9c9', size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Path d="M20 42 L20 28 Q20 16 32 14 Q44 16 44 28 L44 42 Z"
      fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    <Line x1={16} y1={42} x2={48} y2={42} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    <Circle cx={32} cy={48} r={3} fill="none" stroke={color} strokeWidth={2} />
    <Circle cx={32} cy={13} r={2.5} fill="none" stroke={color} strokeWidth={1.5} />
    <Path d="M14 20 Q10 28 14 36" fill="none" stroke={color} strokeWidth={1} strokeLinecap="round" opacity={0.3} />
    <Path d="M50 20 Q54 28 50 36" fill="none" stroke={color} strokeWidth={1} strokeLinecap="round" opacity={0.3} />
  </Svg>
);

const IconOrchid = ({ color = '#7fc9c9', size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    <Circle cx={32} cy={32} r={28} fill="none" stroke={color} strokeWidth={0.8} opacity={0.12} />
    <Circle cx={32} cy={32} r={20} fill="none" stroke={color} strokeWidth={1}   opacity={0.2} />
    <Circle cx={32} cy={32} r={13} fill="none" stroke={color} strokeWidth={1.5} opacity={0.35} />
    <Path d="M32 20 L40 32 L32 44 L24 32 Z"
      fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" opacity={0.8} />
    <Path d="M32 26 L36 32 L32 38 L28 32 Z" fill={color} opacity={0.6} />
    <Line x1={32} y1={44} x2={32} y2={56} stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.45} />
  </Svg>
);

// ── Steps ─────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'welcome',  label: 'a sanctuary that\nbreathes with you', Icon: IconBridge,  cta: 'begin' },
  { id: 'name',     label: 'what should we\ncall you?',          Icon: IconPerson,  cta: 'continue' },
  { id: 'substance',label: 'what are you\nrecovering from?',     Icon: IconRecovery, cta: null },
  { id: 'date',     label: 'when did you\nbegin?',               Icon: IconClock,   cta: 'continue' },
  { id: 'privacy',  label: 'your data never\nleaves this device', Icon: IconVault,   cta: 'continue' },
  { id: 'notifs',   label: 'gentle reminders\nwhen you need them',Icon: IconBell,    cta: 'continue' },
  { id: 'enter',    label: 'the garden\nis ready',               Icon: IconOrchid,  cta: 'enter sanctuary' },
] as const;

const SUBSTANCE_OPTIONS = [
  'alcohol',
  'substances',
  'behavior',
  'other / prefer not to say',
];

// ── Screen ────────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const router = useRouter();
  const { theme } = useAnimatedTheme();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [substance, setSubstance] = useState('');

  const accentColor = theme.accent;
  const phaseRgb    = theme.phaseRgb;

  const advance = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else completeOnboarding();
  };

  const completeOnboarding = async () => {
    await Surface.set('HAS_COMPLETED_ONBOARDING', 'true');
    if (name.trim()) await Surface.set('USER_NAME', name.trim());
    router.replace('/bridge');
  };

  const { id, label, Icon, cta } = STEPS[step];

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
                width: i === step ? 20 : 6,
                backgroundColor: i === step ? accentColor : theme.textMuted,
                opacity: i <= step ? 1 : 0.3,
              },
            ]}
          />
        ))}
      </View>

      {/* Icon */}
      <View style={styles.iconWrap}>
        <Icon color={accentColor} size={72} />
      </View>

      {/* Label */}
      <Text style={[styles.label, { color: theme.text }]}>
        {label}
      </Text>

      {/* Step content */}
      <View style={styles.content}>

        {id === 'name' && (
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="name or nickname"
            placeholderTextColor={theme.textMuted}
            style={[
              styles.input,
              {
                color: theme.text,
                borderColor: accentColor,
                backgroundColor: theme.surface,
              },
            ]}
            autoFocus
          />
        )}

        {id === 'substance' && (
          <View style={styles.options}>
            {SUBSTANCE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                onPress={() => { setSubstance(opt); advance(); }}
                style={[
                  styles.option,
                  {
                    borderColor: substance === opt ? accentColor : theme.textMuted,
                    backgroundColor: substance === opt
                      ? `rgba(${phaseRgb}, 0.1)`
                      : theme.surface,
                  },
                ]}
              >
                <Text style={[styles.optionText, {
                  color: substance === opt ? accentColor : theme.textMuted,
                }]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {id === 'privacy' && (
          <View style={styles.privacyBadges}>
            {([
              ['fortress', 'hardware-encrypted keys'],
              ['sanctuary', 'local sqlite only'],
              ['surface',   'ui preferences'],
            ] as const).map(([vault, desc]) => (
              <View
                key={vault}
                style={[
                  styles.badge,
                  {
                    borderColor: `rgba(${phaseRgb}, 0.3)`,
                    backgroundColor: `rgba(${phaseRgb}, 0.06)`,
                  },
                ]}
              >
                <Text style={[styles.badgeVault, { color: accentColor }]}>
                  {vault}
                </Text>
                <Text style={[styles.badgeDesc, { color: theme.textMuted }]}>
                  {desc}
                </Text>
              </View>
            ))}
            <Text style={[styles.privacyNote, { color: theme.textMuted }]}>
              we physically cannot access your data.
            </Text>
          </View>
        )}
      </View>

      {/* CTA — hidden for substance (auto-advances on tap) */}
      {cta && (
        <TouchableOpacity
          onPress={advance}
          style={[
            styles.cta,
            {
              borderColor: accentColor,
              backgroundColor: `rgba(${phaseRgb}, 0.08)`,
            },
          ]}
        >
          <Text style={[styles.ctaText, { color: accentColor }]}>
            {cta}
          </Text>
        </TouchableOpacity>
      )}

      {/* Counter */}
      <Text style={[styles.counter, { color: theme.textMuted }]}>
        {step + 1} / {STEPS.length}
      </Text>

    </View>
  );
}

// ── Styles — no hyphenated keys ───────────────────────────────────────────────

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
  },
  iconWrap: {
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
    fontFamily: 'CourierPrime',
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
    fontFamily: 'CourierPrime',
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
  optionText: {
    fontSize: 15,
    letterSpacing: 0.3,
    fontFamily: 'CourierPrime',
  },
  privacyBadges: {
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
  badgeVault: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    minWidth: 80,
    fontFamily: 'CourierPrime',
  },
  badgeDesc: {
    fontSize: 13,
    flex: 1,
    fontFamily: 'CourierPrime',
  },
  privacyNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.5,
    opacity: 0.7,
    fontFamily: 'CourierPrime',
  },
  cta: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 48,
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaText: {
    fontSize: 15,
    letterSpacing: 1.5,
    textTransform: 'lowercase',
    fontFamily: 'CourierPrime',
  },
  counter: {
    fontSize: 12,
    letterSpacing: 2,
    opacity: 0.5,
    fontFamily: 'CourierPrime',
  },
});
