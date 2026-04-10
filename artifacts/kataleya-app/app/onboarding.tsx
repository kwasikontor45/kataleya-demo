// app/onboarding.tsx
// Fixed: no hyphenated style keys, no hyphenated ThemeTokens references.
// All theme property access uses camelCase (textMuted, phaseRgb, etc.)

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback,
  Dimensions, TextInput, Platform, Switch, KeyboardAvoidingView,
  Keyboard, ScrollView, Animated, FlatList,
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


// ── Minimal scroll time picker ────────────────────────────────────────────────
const ITEM_H = 36;
const VISIBLE = 3;
const PICKER_H = ITEM_H * VISIBLE;

function TimePicker({
  value, onChange, accentColor, phaseRgb, textMuted,
}: {
  value: Date;
  onChange: (d: Date) => void;
  accentColor: string;
  phaseRgb: string;
  textMuted: string;
}) {
  const hours12 = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const ampm = ['am', 'pm'];

  const currentHour12 = value.getHours() % 12 || 12;
  const currentMinute = Math.round(value.getMinutes() / 5) * 5 % 60;
  const currentAmPm = value.getHours() >= 12 ? 'pm' : 'am';

  const hourRef = useRef<FlatList>(null);
  const minRef = useRef<FlatList>(null);
  const ampmRef = useRef<FlatList>(null);

  const scrollTo = (ref: React.RefObject<FlatList>, index: number) => {
    ref.current?.scrollToIndex({ index: Math.max(0, index), animated: true, viewPosition: 0.5 });
  };

  const handleHour = (h: number) => {
    const d = new Date(value);
    const isPm = d.getHours() >= 12;
    d.setHours(isPm ? (h % 12) + 12 : h % 12);
    onChange(d);
  };

  const handleMinute = (m: number) => {
    const d = new Date(value);
    d.setMinutes(m);
    onChange(d);
  };

  const handleAmPm = (ap: string) => {
    const d = new Date(value);
    const h = d.getHours();
    if (ap === 'am' && h >= 12) d.setHours(h - 12);
    if (ap === 'pm' && h < 12) d.setHours(h + 12);
    onChange(d);
  };

  const renderItem = (
    item: string | number,
    isSelected: boolean,
    onSelect: () => void,
  ) => (
    <TouchableOpacity
      onPress={onSelect}
      style={[pickerStyles.item, { height: ITEM_H }]}
      activeOpacity={0.7}
    >
      <Text style={[
        pickerStyles.itemText,
        {
          color: isSelected ? accentColor : `${textMuted}55`,
          fontSize: isSelected ? 20 : 15,
          fontWeight: isSelected ? '300' : '300',
        },
      ]}>
        {typeof item === 'number' ? String(item).padStart(2, '0') : item}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={pickerStyles.root}>
      {/* Selection highlight */}
      <View style={[pickerStyles.highlight, {
        borderColor: `rgba(${phaseRgb},0.2)`,
        backgroundColor: `rgba(${phaseRgb},0.06)`,
      }]} pointerEvents="none" />

      {/* Hours */}
      <FlatList
        ref={hourRef}
        data={hours12}
        keyExtractor={i => String(i)}
        style={pickerStyles.col}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_H }}
        getItemLayout={(_, index) => ({ length: ITEM_H, offset: ITEM_H * index, index })}
        onLayout={() => {
          const idx = hours12.indexOf(currentHour12);
          if (idx >= 0) scrollTo(hourRef, idx);
        }}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
          if (hours12[idx] !== undefined) handleHour(hours12[idx]);
        }}
        renderItem={({ item }) => renderItem(
          item,
          item === currentHour12,
          () => { handleHour(item); scrollTo(hourRef, hours12.indexOf(item)); }
        )}
      />

      <Text style={[pickerStyles.sep, { color: `rgba(${phaseRgb},0.35)` }]}>:</Text>

      {/* Minutes */}
      <FlatList
        ref={minRef}
        data={minutes}
        keyExtractor={i => String(i)}
        style={pickerStyles.col}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_H }}
        getItemLayout={(_, index) => ({ length: ITEM_H, offset: ITEM_H * index, index })}
        onLayout={() => {
          const idx = minutes.indexOf(currentMinute);
          if (idx >= 0) scrollTo(minRef, idx);
        }}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
          if (minutes[idx] !== undefined) handleMinute(minutes[idx]);
        }}
        renderItem={({ item }) => renderItem(
          item,
          item === currentMinute,
          () => { handleMinute(item); scrollTo(minRef, minutes.indexOf(item)); }
        )}
      />

      {/* AM/PM */}
      <FlatList
        ref={ampmRef}
        data={ampm}
        keyExtractor={i => i}
        style={[pickerStyles.col, { width: 44 }]}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_H }}
        getItemLayout={(_, index) => ({ length: ITEM_H, offset: ITEM_H * index, index })}
        onLayout={() => {
          const idx = ampm.indexOf(currentAmPm);
          if (idx >= 0) scrollTo(ampmRef, idx);
        }}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
          if (ampm[idx]) handleAmPm(ampm[idx]);
        }}
        renderItem={({ item }) => renderItem(
          item,
          item === currentAmPm,
          () => { handleAmPm(item); scrollTo(ampmRef, ampm.indexOf(item)); }
        )}
      />
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    height: PICKER_H,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  col: {
    width: 52,
    height: PICKER_H,
  },
  sep: {
    fontFamily: 'CourierPrime',
    fontSize: 20,
    fontWeight: '300',
    marginHorizontal: 2,
    marginBottom: 4,
  },
  highlight: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: ITEM_H,
    borderRadius: 8,
    borderWidth: 1,
    top: ITEM_H,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontFamily: 'CourierPrime',
    letterSpacing: 1,
  },
});

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
              scheduled locally — no content sent to servers
            </Text>
            {[
              {
                key: 'morning',
                label: 'morning check-in',
                enabled: morningEnabled,
                toggle: setMorningEnabled,
                time: morningTime,
                setTime: setMorningTime,
              },
              {
                key: 'evening',
                label: 'evening reflection',
                enabled: eveningEnabled,
                toggle: setEveningEnabled,
                time: eveningTime,
                setTime: setEveningTime,
              },
            ].map(r => (
              <View
                key={r.key}
                style={[
                  styles.reminderRow,
                  {
                    borderColor: r.enabled ? `rgba(${phaseRgb},0.3)` : `rgba(${phaseRgb},0.1)`,
                    backgroundColor: r.enabled ? `rgba(${phaseRgb},0.06)` : `rgba(${phaseRgb},0.02)`,
                    opacity: r.enabled ? 1 : 0.5,
                  },
                ]}
              >
                {/* Label + toggle row */}
                <View style={styles.reminderLeft}>
                  <Text style={[styles.reminderLabel, { color: r.enabled ? accentColor : theme.textMuted }]}>
                    {r.label}
                  </Text>
                  <Switch
                    value={r.enabled}
                    onValueChange={r.toggle}
                    trackColor={{ false: `rgba(${phaseRgb},0.15)`, true: `rgba(${phaseRgb},0.45)` }}
                    thumbColor={r.enabled ? accentColor : theme.textMuted}
                    ios_backgroundColor={`rgba(${phaseRgb},0.15)`}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                </View>

                {/* Scroll time picker */}
                {r.enabled && (
                  <TimePicker
                    value={r.time}
                    onChange={r.setTime}
                    accentColor={accentColor}
                    phaseRgb={phaseRgb}
                    textMuted={theme.textMuted}
                  />
                )}
              </View>
            ))}
            <Text style={[styles.notifsHint, { color: `${theme.textMuted}55` }]}>
              tap to change · hold to go back
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
    gap: 10,
  },
  notifsSubtitle: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 2,
    opacity: 0.6,
  },
  notifsHint: {
    fontFamily: 'CourierPrime',
    fontSize: 9,
    textAlign: 'center',
    letterSpacing: 1,
    marginTop: 4,
  },
  reminderBlock: { gap: 0 },
  reminderRow: {
    flexDirection: 'column',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  reminderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  reminderHint: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    opacity: 0.6,
  },
});
