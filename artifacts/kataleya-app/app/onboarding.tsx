'use no memo';
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Platform,
  Keyboard,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useCircadian } from '@/hooks/useCircadian';
import { Surface } from '@/utils/storage';
import { DataBridge } from '@/components/DataBridge';
import { sanitizeName, sanitizeSubstance } from '@/utils/sanitize';

type Step = 'welcome' | 'name' | 'substance' | 'sobriety_date' | 'privacy' | 'notifications' | 'ready';

const STEP_ORDER: Step[] = ['welcome', 'name', 'substance', 'sobriety_date', 'privacy', 'notifications', 'ready'];

const SUBSTANCES = ['Alcohol', 'Substances', 'Behavior', 'Other / Prefer not to say'];

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function stepNumber(step: Step): string {
  const map: Partial<Record<Step, string>> = {
    name: '01 / 05',
    substance: '02 / 05',
    sobriety_date: '03 / 05',
    privacy: '04 / 05',
    notifications: '05 / 05',
  };
  return map[step] ?? '';
}

const PRIVACY_ITEMS = [
  { symbol: '◆', label: 'Everything lives only on this device.' },
  { symbol: '◆', label: 'No account. No cloud sync. No ads.' },
  { symbol: '◆', label: 'Your sponsor only sees check-ins you choose to share.' },
  { symbol: '◆', label: 'Mood logs, journal entries, and growth data never leave your phone.' },
  { symbol: '◆', label: 'Burn Ritual erases everything, instantly and irreversibly.' },
];

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, phase, phaseConfig } = useCircadian();

  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [substance, setSubstance] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateConfirmed, setDateConfirmed] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [notifStatus, setNotifStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const nameRef = useRef<TextInput>(null);

  const goTo = (s: Step) => {
    Keyboard.dismiss();
    Haptics.selectionAsync();
    setStep(s);
  };

  const goBack = () => {
    Keyboard.dismiss();
    Haptics.selectionAsync();
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) {
      setStep(STEP_ORDER[idx - 1]);
    } else {
      router.back();
    }
  };

  const requestNotifications = async () => {
    // expo-notifications permission request only runs on iOS in Expo Go.
    // Android push notifications were removed from Expo Go in SDK 53.
    // Restore Platform.OS !== 'web' guard for EAS native builds.
    if (Platform.OS !== 'ios') {
      setNotifStatus('denied');
      goTo('ready');
      return;
    }
    try {
      const N = await import('expo-notifications');
      const { status } = await N.requestPermissionsAsync();
      const granted = status === 'granted';
      await Surface.setNotifEnabled(granted);
      setNotifStatus(granted ? 'granted' : 'denied');
    } catch {
      setNotifStatus('denied');
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    goTo('ready');
  };

  const skipNotifications = async () => {
    await Surface.setNotifEnabled(false);
    setNotifStatus('denied');
    goTo('ready');
  };

  const finish = async () => {
    Keyboard.dismiss();
    const cleanName = sanitizeName(name);
    const cleanSubstance = sanitizeSubstance(substance, SUBSTANCES);
    if (cleanName) await Surface.setName(cleanName);
    if (cleanSubstance) await Surface.setSubstance(cleanSubstance);
    if (dateConfirmed) {
      const clamped = new Date(Math.min(selectedDate.getTime(), Date.now()));
      await Surface.setSobrietyStart(clamped.toISOString());
    }
    await Surface.setOnboarded();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(tabs)');
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top + 16;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom + 16;
  const showBack = step !== 'welcome';
  const num = stepNumber(step);

  // Derive picker theme from current background luminance so the inline
  // iOS calendar is always readable — 'dark' in night phase, 'light' in dawn/day.
  const bgHex = theme.bg.replace('#', '');
  const bgN = parseInt(bgHex, 16);
  const bgLuminance = 0.299 * ((bgN >> 16) & 255) + 0.587 * ((bgN >> 8) & 255) + 0.114 * (bgN & 255);
  const pickerVariant: 'dark' | 'light' = bgLuminance < 128 ? 'dark' : 'light';

  return (
    <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }} accessible={false}>
      <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: topPad, paddingBottom: botPad }]}>

        <View style={styles.navRow}>
          {showBack ? (
            <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={12}>
              <Text style={[styles.backText, { color: theme.textMuted }]}>← back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
          {num ? (
            <Text style={[styles.stepLabel, { color: theme.textMuted }]}>{num}</Text>
          ) : null}
        </View>

        {step === 'welcome' && (
          <View style={styles.stepContainer}>
            <DataBridge phase={phase} theme={theme} size="large" />
            <View style={styles.textBlock}>
              <Text style={[styles.title, { color: theme.text }]}>Kataleya</Text>
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                A sanctuary that breathes with you.{'\n'}
                Privacy-first. Circadian-aware.{'\n'}
                Yours alone.
              </Text>
            </View>
            <TouchableOpacity style={[styles.btn, { borderColor: theme.accent }]} onPress={() => goTo('name')}>
              <Text style={[styles.btnText, { color: theme.accent }]}>Begin</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'name' && (
          <View style={styles.stepContainer}>
            <Text style={[styles.question, { color: theme.text }]}>What should we call you?</Text>
            <Text style={[styles.hint, { color: theme.textMuted }]}>Name or nickname. Stored only on this device.</Text>

            <View style={styles.inputRow}>
              <TextInput
                ref={nameRef}
                value={name}
                onChangeText={setName}
                placeholder="Your name..."
                placeholderTextColor={theme.textMuted}
                style={[styles.input, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface, flex: 1 }]}
                autoFocus
                returnKeyType="done"
                blurOnSubmit
                maxLength={40}
                onSubmitEditing={() => goTo('substance')}
              />
              <TouchableOpacity
                onPress={Keyboard.dismiss}
                style={[styles.kbdDismiss, { borderColor: theme.border, backgroundColor: theme.surface }]}
              >
                <Text style={[styles.kbdDismissText, { color: theme.textMuted }]}>⌄</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.btn, { borderColor: theme.accent }]} onPress={() => goTo('substance')}>
              <Text style={[styles.btnText, { color: theme.accent }]}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => goTo('substance')}>
              <Text style={[styles.skipText, { color: theme.textMuted }]}>skip</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'substance' && (
          <View style={styles.stepContainer}>
            <Text style={[styles.question, { color: theme.text }]}>What are you recovering from?</Text>
            <Text style={[styles.hint, { color: theme.textMuted }]}>Never shared. Helps the orchid grow with you.</Text>

            <View style={styles.choices}>
              {SUBSTANCES.map(s => (
                <TouchableOpacity
                  key={s}
                  onPress={() => {
                    setSubstance(s);
                    Haptics.selectionAsync();
                    setTimeout(() => goTo('sobriety_date'), 200);
                  }}
                  style={[
                    styles.choiceBtn,
                    {
                      borderColor: substance === s ? theme.accent : theme.border,
                      backgroundColor: substance === s ? `${theme.accent}18` : theme.surface,
                    },
                  ]}
                >
                  <Text style={[styles.choiceText, { color: theme.text }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => goTo('sobriety_date')}>
              <Text style={[styles.skipText, { color: theme.textMuted }]}>skip</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'sobriety_date' && (
          <View style={styles.stepContainer}>
            <Text style={[styles.question, { color: theme.text }]}>When did you begin?</Text>
            <Text style={[styles.hint, { color: theme.textMuted }]}>
              Select the date your sobriety started. Required to track your growth.
            </Text>

            <TouchableOpacity
              style={[styles.dateBtn, { borderColor: dateConfirmed ? theme.accent : theme.border, backgroundColor: theme.surface }]}
              onPress={() => { setShowPicker(v => !v); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.dateBtnLabel, { color: theme.textMuted }]}>
                {showPicker ? 'tap to close calendar' : 'select date'}
              </Text>
              <Text style={[styles.dateBtnValue, { color: dateConfirmed ? theme.accent : theme.text }]}>
                {dateConfirmed ? formatDate(selectedDate) : 'choose a date →'}
              </Text>
            </TouchableOpacity>

            {showPicker && Platform.OS !== 'web' && (
              <View style={[styles.pickerWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                  maximumDate={new Date()}
                  onChange={(_event, date) => {
                    if (date) {
                      setSelectedDate(date);
                      setDateConfirmed(true);
                      if (Platform.OS === 'android') setShowPicker(false);
                    }
                  }}
                  themeVariant={pickerVariant}
                  accentColor={theme.accent}
                />
              </View>
            )}

            {showPicker && Platform.OS === 'web' && (
              <View style={[styles.webDateWrap, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                <input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  style={{
                    background: 'transparent', border: 'none',
                    color: theme.text, fontFamily: 'CourierPrime',
                    fontSize: 15, width: '100%', outline: 'none', padding: '8px 0',
                  }}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    if (!isNaN(d.getTime())) {
                      setSelectedDate(d);
                      setDateConfirmed(true);
                    }
                  }}
                />
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.btn,
                {
                  borderColor: dateConfirmed ? theme.accent : theme.border,
                  opacity: dateConfirmed ? 1 : 0.5,
                },
              ]}
              onPress={() => {
                if (!dateConfirmed) return;
                goTo('privacy');
              }}
              disabled={!dateConfirmed}
            >
              <Text style={[styles.btnText, { color: dateConfirmed ? theme.accent : theme.textMuted }]}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => goTo('privacy')}>
              <Text style={[styles.skipText, { color: theme.textMuted }]}>skip without a date</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'privacy' && (
          <View style={styles.stepContainer}>
            <Text style={[styles.question, { color: theme.text }]}>Your data is yours.</Text>
            <Text style={[styles.hint, { color: theme.textMuted }]}>
              Kataleya was built from the ground up for privacy. Here is exactly what that means.
            </Text>

            <View style={[styles.privacyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {PRIVACY_ITEMS.map((item, i) => (
                <View key={i} style={[styles.privacyRow, i < PRIVACY_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: `${theme.border}60` }]}>
                  <Text style={[styles.privacySymbol, { color: theme.accent }]}>{item.symbol}</Text>
                  <Text style={[styles.privacyLabel, { color: theme.text }]}>{item.label}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={[styles.btn, { borderColor: theme.accent }]} onPress={() => goTo('notifications')}>
              <Text style={[styles.btnText, { color: theme.accent }]}>I understand</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'notifications' && (
          <View style={styles.stepContainer}>
            <Text style={[styles.question, { color: theme.text }]}>Stay connected to your growth.</Text>
            <Text style={[styles.hint, { color: theme.textMuted }]}>
              Optional gentle reminders for your daily check-in and milestone celebrations. You can change this any time in settings.
            </Text>

            <View style={[styles.privacyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.privacyRow}>
                <Text style={[styles.privacySymbol, { color: theme.accent }]}>◆</Text>
                <Text style={[styles.privacyLabel, { color: theme.text }]}>Daily mood reminder (evening, configurable)</Text>
              </View>
              <View style={[styles.privacyRow, { borderTopWidth: 1, borderTopColor: `${theme.border}60` }]}>
                <Text style={[styles.privacySymbol, { color: theme.accent }]}>◆</Text>
                <Text style={[styles.privacyLabel, { color: theme.text }]}>Milestone bloom celebrations</Text>
              </View>
              <View style={[styles.privacyRow, { borderTopWidth: 1, borderTopColor: `${theme.border}60` }]}>
                <Text style={[styles.privacySymbol, { color: theme.accent }]}>◆</Text>
                <Text style={[styles.privacyLabel, { color: theme.text }]}>No marketing. No alerts from third parties.</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.btn, { borderColor: theme.accent, backgroundColor: `${theme.accent}20` }]}
              onPress={requestNotifications}
            >
              <Text style={[styles.btnText, { color: theme.accent }]}>Allow notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={skipNotifications}>
              <Text style={[styles.skipText, { color: theme.textMuted }]}>not now</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'ready' && (
          <View style={styles.stepContainer}>
            <DataBridge phase={phase} theme={theme} size="large" />
            <View style={styles.textBlock}>
              <Text style={[styles.title, { color: theme.text }]}>The sanctuary is ready.</Text>
              <Text style={[styles.subtitle, { color: theme.textMuted }]}>{phaseConfig.description}</Text>
              {notifStatus === 'granted' && (
                <Text style={[styles.notifNote, { color: theme.textMuted }]}>
                  Gentle reminders are on. You can adjust them in your vault settings.
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.btn, { borderColor: theme.accent, backgroundColor: `${theme.accent}20` }]}
              onPress={finish}
            >
              <Text style={[styles.btnText, { color: theme.accent }]}>Enter Sanctuary</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 28 },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    minHeight: 36,
  },
  backBtn: { minWidth: 60 },
  backText: {
    fontFamily: 'CourierPrime',
    fontSize: 12,
    letterSpacing: 1,
  },
  stepLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  stepContainer: { flex: 1, justifyContent: 'center', gap: 20 },
  textBlock: { gap: 10 },
  title: { fontFamily: 'CourierPrime', fontSize: 28, fontWeight: '700', letterSpacing: 0.5 },
  subtitle: { fontFamily: 'CourierPrime', fontSize: 14, lineHeight: 22 },
  question: { fontFamily: 'CourierPrime', fontSize: 22, fontWeight: '700' },
  hint: { fontFamily: 'CourierPrime', fontSize: 12, lineHeight: 18 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: 'CourierPrime', fontSize: 15,
  },
  kbdDismiss: {
    borderWidth: 1, borderRadius: 8,
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  kbdDismissText: { fontSize: 20, lineHeight: 24 },
  btn: { borderWidth: 1, borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  btnText: { fontFamily: 'CourierPrime', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' },
  skipText: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 1.5, textAlign: 'center' },
  choices: { gap: 8 },
  choiceBtn: { borderWidth: 1, borderRadius: 8, padding: 13 },
  choiceText: { fontFamily: 'CourierPrime', fontSize: 14 },
  dateBtn: { borderWidth: 1, borderRadius: 8, padding: 14, gap: 4 },
  dateBtnLabel: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  dateBtnValue: { fontFamily: 'CourierPrime', fontSize: 15 },
  pickerWrap: { borderWidth: 1, borderRadius: 12, paddingVertical: 8 },
  webDateWrap: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 4 },
  privacyCard: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  privacySymbol: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    marginTop: 3,
    flexShrink: 0,
  },
  privacyLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  notifNote: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
});
