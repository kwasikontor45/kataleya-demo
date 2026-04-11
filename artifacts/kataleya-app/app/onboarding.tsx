// app/onboarding.tsx
// System initialization sequence. Not a slideshow — a protocol boot.

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback,
  Dimensions, TextInput, Platform, Switch, KeyboardAvoidingView,
  Keyboard, Animated, Easing, FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useAnimatedTheme } from '@/hooks/useAnimatedTheme';
import { Surface } from '@/utils/storage';
import { TypewriterText } from '@/components/typewriter-text';
import { ScanlineLayer } from '@/components/scanline-layer';

const { width } = Dimensions.get('window');

// ── Segment progress indicator — protocol boot sequence ───────────────────────
function segmentBar(total: number, current: number): string {
  return Array.from({ length: total }, (_, i) =>
    i < current ? '—' : i === current ? '◈' : '·'
  ).join('  ');
}


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
  const minutes = Array.from({ length: 60 }, (_, i) => i); // 0-59, every minute
  const ampm = ['am', 'pm'];

  const currentHour12 = value.getHours() % 12 || 12;
  const currentMinute = value.getMinutes();
  const currentAmPm = value.getHours() >= 12 ? 'pm' : 'am';

  const hourRef = useRef<any>(null);
  const minRef = useRef<any>(null);
  const ampmRef = useRef<any>(null);

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
    width: 56,
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
  { id: 'welcome',   label: 'a sanctuary that\nbreathes with you',  cta: 'begin' },
  { id: 'name',      label: 'what should we\ncall you?',            cta: 'continue' },
  { id: 'substance', label: 'what are you\nrecovering from?',       cta: null },
  { id: 'date',      label: 'when did you\nbegin?',                 cta: 'continue' },
  { id: 'privacy',   label: 'your data never\nleaves this device',  cta: 'continue' },
  { id: 'notifs',    label: 'gentle reminders\nwhen you need them', cta: 'continue' },
  { id: 'enter',     label: 'three things,\nalways here',           cta: 'enter' },
] as const;

// ── Onboarding narration — Amor Fati audio script mapped to steps ─────────────
// Ambient text beneath each step label. Fades in 600ms after step loads.
// No interaction required. Words appear. Words fade. Presence only.
const NARRATION: Record<string, { line1: string; line2?: string }> = {
  welcome:   { line1: "Some things don't need to be tracked", line2: "to be understood." },
  name:      { line1: "A quiet place where healing", line2: "doesn't perform for anyone." },
  substance: { line1: "2am is not the same as dawn.", line2: "The circadian engine knows this." },
  date:      { line1: "Growth is measured in seasons,", line2: "not streaks." },
  privacy:   { line1: "Three vaults. Sealed by design.", line2: "The blind relay carries only what it cannot read." },
  notifs:    { line1: "The app should know as little", line2: "about you as possible." },
  enter:     { line1: "the garden is always open.", line2: "return whenever you need." },
};

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
  const narrationOpacity = useRef(new Animated.Value(0)).current;
  const [morningEnabled, setMorningEnabled] = useState(true);
  const [eveningEnabled, setEveningEnabled] = useState(true);
  const [morningTime, setMorningTime] = useState(() => { const d = new Date(); d.setHours(8, 0, 0, 0); return d; });
  const [eveningTime, setEveningTime] = useState(() => { const d = new Date(); d.setHours(21, 0, 0, 0); return d; });

  const accentColor = theme.accent;
  const phaseRgb    = theme.phaseRgb;

  // Narration fade — ambient text breathes in on each step
  useEffect(() => {
    narrationOpacity.setValue(0);
    const t = setTimeout(() => {
      Animated.timing(narrationOpacity, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.sin),
      }).start();
    }, 600);
    return () => clearTimeout(t);
  }, [step]);

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

  const { id, label, cta } = STEPS[step];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.root, { backgroundColor: theme.bg }]}>
          <ScanlineLayer />

      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={goBack}>
        <Text style={[styles.backText, { color: `rgba(${phaseRgb},0.35)` }]}>‹</Text>
      </TouchableOpacity>

      {/* Segment bar */}
      <View style={styles.segmentWrap}>
        <Text style={[styles.segmentBar, { color: `rgba(${phaseRgb},0.55)` }]}>
          {segmentBar(STEPS.length, step)}
        </Text>
      </View>

      {/* Label — types in on each step */}
      <TypewriterText
        key={step}
        text={label}
        speed={14}
        jitter={5}
        style={[styles.label, { color: theme.text }]}
      />

      {/* Narration — terminal comment style, fades in after label */}
      {NARRATION[id] && (
        <Animated.View style={[styles.narrationWrap, { opacity: narrationOpacity }]}>
          <Text style={[styles.narrationLine, { color: `rgba(${phaseRgb},0.32)` }]}>
            {NARRATION[id].line1}
          </Text>
          {NARRATION[id].line2 && (
            <Text style={[styles.narrationLine, { color: `rgba(${phaseRgb},0.22)` }]}>
              {NARRATION[id].line2}
            </Text>
          )}
        </Animated.View>
      )}

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

        {id === 'enter' && (
          <View style={styles.threeThings}>
            {([
              { glyph: '~',  title: 'breathe',       hint: 'the orb breathes with you' },
              { glyph: '+',  title: 'check in',       hint: 'mood and a few quiet words' },
              { glyph: '::',  title: 'reach sponsor', hint: 'one signal. they\'ll know.' },
            ] as const).map(({ glyph, title, hint }) => (
              <View
                key={title}
                style={[
                  styles.thingRow,
                  {
                    borderColor: `rgba(${phaseRgb}, 0.18)`,
                    backgroundColor: `rgba(${phaseRgb}, 0.05)`,
                  },
                ]}
              >
                <Text style={[styles.thingGlyph, { color: accentColor }]}>
                  {glyph}
                </Text>
                <View style={styles.thingText}>
                  <Text style={[styles.thingTitle, { color: theme.text }]}>
                    {title}
                  </Text>
                  <Text style={[styles.thingHint, { color: theme.textMuted }]}>
                    {hint}
                  </Text>
                </View>
              </View>
            ))}
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

          </View>
        )}

      </View>

      {/* CTA — hidden for substance (auto-advances on tap) */}
      {cta && (
        <TouchableOpacity
          onPress={advance}
          activeOpacity={0.7}
          style={[
            styles.cta,
            {
              borderColor: `rgba(${phaseRgb},0.28)`,
              borderTopColor: `rgba(${phaseRgb},0.55)`,
              borderTopWidth: 1.5,
              backgroundColor: `rgba(${phaseRgb},0.05)`,
              shadowColor: `rgb(${phaseRgb})`,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 3,
            },
          ]}
        >
          <Text style={[styles.ctaText, { color: `rgba(${phaseRgb},0.85)` }]}>
            {cta}
          </Text>
        </TouchableOpacity>
      )}

      {/* Counter */}
      <Text style={[styles.counter, { color: `rgba(${phaseRgb},0.25)` }]}>
        sys · {String(step + 1).padStart(2, '0')} · {String(STEPS.length).padStart(2, '0')}
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
  segmentWrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 64 : 48,
    alignItems: 'center',
  },
  segmentBar: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 3,
  },
  label: {
    fontSize: 22,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 16,
    marginTop: 8,
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
    borderRadius: 3,
    paddingVertical: 14,
    paddingHorizontal: 56,
    alignItems: 'center',
    marginBottom: 16,
  },
  ctaText: {
    fontSize: 12,
    letterSpacing: 3,
    textTransform: 'lowercase',
    fontFamily: 'CourierPrime',
  },
  counter: {
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: 'CourierPrime',
  },
  narrationWrap: {
    alignItems: 'flex-start',
    marginTop: 0,
    marginBottom: 20,
    gap: 3,
    paddingHorizontal: 4,
    width: '100%',
  },
  narrationLine: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 0.3,
    lineHeight: 17,
    textAlign: 'left',
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 44,
    left: 24,
    padding: 8,
  },
  backText: {
    fontSize: 24,
    letterSpacing: 0,
    fontFamily: 'CourierPrime',
  },
  dateWrap: {
    alignItems: 'center',
    width: '100%',
  },
  datePicker: {
    width: '100%',
    height: 160,
  },
  notifsWrap: {},
  notifsSubtitle: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 2,
    opacity: 0.6,
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
  threeThings: {
    gap: 10,
    width: '100%',
  },
  thingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 16,
  },
  thingGlyph: {
    fontFamily: 'CourierPrime',
    fontSize: 18,
    width: 22,
    textAlign: 'center',
    letterSpacing: 1,
    opacity: 0.85,
  },
  thingText: {
    flex: 1,
    gap: 2,
  },
  thingTitle: {
    fontFamily: 'CourierPrime',
    fontSize: 14,
    letterSpacing: 0.8,
    textTransform: 'lowercase',
  },
  thingHint: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 0.3,
    opacity: 0.6,
    lineHeight: 16,
  },
});
