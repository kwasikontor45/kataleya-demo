// app/onboarding.tsx
// Fixed: no hyphenated style keys, no hyphenated ThemeTokens references.
// All theme property access uses camelCase (textMuted, phaseRgb, etc.)

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback,
  Dimensions, TextInput, Platform, Switch, KeyboardAvoidingView,
  Keyboard, ScrollView, Animated,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Circle, Path, Line, Rect } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { useAnimatedTheme } from '@/hooks/useAnimatedTheme';
import { Surface } from '@/utils/storage';

const { width } = Dimensions.get('window');

// ── SVG Icons — no emojis, theme-colored ─────────────────────────────────────

const IconBridge = ({ color = '#7fc9c9', size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64">
    {/* Outer ring — barely visible */}
    <Circle cx={32} cy={32} r={30} fill="none" stroke={color} strokeWidth={0.6} opacity={0.15} />
    {/* Middle ring */}
    <Circle cx={32} cy={32} r={22} fill="none" stroke={color} strokeWidth={0.9} opacity={0.25} />
    {/* Inner ring */}
    <Circle cx={32} cy={32} r={14} fill="none" stroke={color} strokeWidth={1.2} opacity={0.4} />
    {/* Core glow */}
    <Circle cx={32} cy={32} r={7} fill={color} opacity={0.15} />
    <Circle cx={32} cy={32} r={4} fill={color} opacity={0.5} />
    {/* Pulse dots at cardinal points */}
    <Circle cx={32} cy={6}  r={1.5} fill={color} opacity={0.4} />
    <Circle cx={58} cy={32} r={1.5} fill={color} opacity={0.4} />
    <Circle cx={32} cy={58} r={1.5} fill={color} opacity={0.4} />
    <Circle cx={6}  cy={32} r={1.5} fill={color} opacity={0.4} />
    {/* Diagonal accents */}
    <Circle cx={52} cy={12} r={1} fill={color} opacity={0.25} />
    <Circle cx={12} cy={52} r={1} fill={color} opacity={0.25} />
    <Circle cx={52} cy={52} r={1} fill={color} opacity={0.25} />
    <Circle cx={12} cy={12} r={1} fill={color} opacity={0.25} />
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
  const [sobrietyDate, setSobrietyDate] = useState(new Date());
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [eveningEnabled, setEveningEnabled] = useState(true);
  const [morningTime, setMorningTime] = useState(() => { const d = new Date(); d.setHours(8, 0, 0, 0); return d; });
  const [eveningTime, setEveningTime] = useState(() => { const d = new Date(); d.setHours(21, 0, 0, 0); return d; });

  const accentColor = theme.accent;
  const phaseRgb    = theme.phaseRgb;

  const advance = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else completeOnboarding();
  };

  const goBack = () => {
    if (step > 0) setStep(s => s - 1);
    else router.replace('/bridge');
  };

  const completeOnboarding = async () => {
    await Surface.setOnboarded();
    if (name.trim()) await Surface.setName(name.trim());
    if (substance) await Surface.setSubstance(substance);
    await Surface.setSobrietyStart(sobrietyDate.toISOString());
    router.replace('/(tabs)');
  };

  const { id, label, Icon, cta } = STEPS[step];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.root, { backgroundColor: theme.bg }]}>

      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={goBack}>
        <Text style={[styles.backText, { color: theme.textMuted }]}>←</Text>
      </TouchableOpacity>

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
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View>
              <TextInput
                value={name}
                onChangeText={setName}
                onSubmitEditing={name.trim() ? advance : undefined}
                placeholder="name or nickname"
                placeholderTextColor={theme.textMuted}
                returnKeyType="done"
                blurOnSubmit
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
              {name.trim().length > 0 && (
                <TouchableOpacity
                  onPress={Keyboard.dismiss}
                  style={[styles.kbDismiss, { borderColor: `rgba(${phaseRgb},0.2)` }]}
                >
                  <Text style={[styles.kbDismissText, { color: `rgba(${phaseRgb},0.5)` }]}>
                    ⌨ done
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableWithoutFeedback>
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

        {id === 'date' && (
          <View style={styles.dateWrap}>
            <DateTimePicker
              value={sobrietyDate}
              mode="date"
              display="spinner"
              onChange={(_e, date) => { if (date) setSobrietyDate(date); }}
              maximumDate={new Date()}
              themeVariant="dark"
              style={styles.datePicker}
            />
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

        {id === 'notifs' && (
          <View style={styles.notifsWrap}>
            <Text style={[styles.notifsSubtitle, { color: theme.textMuted }]}>
              Scheduled locally — no content sent to servers.
            </Text>
            {[
              {
                key: 'morning',
                label: 'Morning check-in',
                hint: 'Start your day with intention',
                enabled: morningEnabled,
                toggle: setMorningEnabled,
                time: morningTime,
                setTime: setMorningTime,
              },
              {
                key: 'evening',
                label: 'Evening reflection',
                hint: 'Close the day with gratitude',
                enabled: eveningEnabled,
                toggle: setEveningEnabled,
                time: eveningTime,
                setTime: setEveningTime,
              },
            ].map(r => (
              <View key={r.key}>
                {/* ── Toggle row ── */}
                <View
                  style={[
                    styles.reminderRow,
                    {
                      borderColor: r.enabled ? `rgba(${phaseRgb},0.35)` : `rgba(${phaseRgb},0.12)`,
                      backgroundColor: r.enabled ? `rgba(${phaseRgb},0.07)` : `rgba(${phaseRgb},0.02)`,
                      borderBottomLeftRadius: r.enabled ? 0 : 12,
                      borderBottomRightRadius: r.enabled ? 0 : 12,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reminderLabel, { color: r.enabled ? accentColor : theme.textMuted }]}>
                      {r.label}
                    </Text>
                    <Text style={[styles.reminderHint, { color: theme.textMuted }]}>
                      {r.hint}
                    </Text>
                  </View>
                  <Switch
                    value={r.enabled}
                    onValueChange={r.toggle}
                    trackColor={{ false: `rgba(${phaseRgb},0.15)`, true: `rgba(${phaseRgb},0.5)` }}
                    thumbColor={r.enabled ? accentColor : theme.textMuted}
                    ios_backgroundColor={`rgba(${phaseRgb},0.15)`}
                  />
                </View>

                {/* ── Time picker — slides in when toggle is on ── */}
                {r.enabled && (
                  <View style={[
                    styles.timePickerWrap,
                    {
                      borderColor: `rgba(${phaseRgb},0.35)`,
                      backgroundColor: `rgba(${phaseRgb},0.04)`,
                    },
                  ]}>
                    <DateTimePicker
                      value={r.time}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(_e, date) => { if (date) r.setTime(date); }}
                      themeVariant="dark"
                      style={styles.timePicker}
                    />
                  </View>
                )}
              </View>
            ))}
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
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
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
  kbDismiss: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  kbDismissText: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 1,
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
  backBtn: {
    position: 'absolute',
    top: 56,
    left: 24,
    padding: 8,
  },
  backText: {
    fontSize: 20,
    letterSpacing: 1,
  },
  dateWrap: {
    alignItems: 'center',
    width: '100%',
  },
  datePicker: {
    width: '100%',
    height: 160,
  },
  notifsWrap: {
    gap: 12,
  },
  notifsSubtitle: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 4,
    opacity: 0.7,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  reminderLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  reminderHint: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    opacity: 0.7,
  },
  timePickerWrap: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    alignItems: 'center',
    paddingVertical: 4,
    overflow: 'hidden',
  },
  timePicker: {
    width: '100%',
    height: 120,
  },
});
