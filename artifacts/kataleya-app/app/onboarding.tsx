'use no memo';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Platform,
  Keyboard,
  Animated,
  Easing,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useCircadian } from '@/hooks/useCircadian';
import { Surface } from '@/utils/storage';
import { sanitizeName, sanitizeSubstance } from '@/utils/sanitize';

type Step = 'welcome' | 'name' | 'substance' | 'sobriety_date' | 'privacy' | 'notifications' | 'ready';
const STEP_ORDER: Step[] = ['welcome', 'name', 'substance', 'sobriety_date', 'privacy', 'notifications', 'ready'];
const SUBSTANCES = ['Alcohol', 'Substances', 'Behaviour', 'Other / prefer not to say'];

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ── 72 BPM resting heart — self-contained, no hooks needed ────────────────
// Used on welcome and ready screens to signal life before any interaction
function RestingHeart({ accentRgb }: { accentRgb: string }) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    // 72 BPM = 833ms per beat. Two-part beat: lub (short) + dub (longer rest)
    const beat = () => {
      Animated.sequence([
        // lub — quick compress and release
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1.18, duration: 120, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1.0,  duration: 120, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 0.96, duration: 110, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.7,  duration: 110, useNativeDriver: true }),
        ]),
        // dub — smaller second beat
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1.08, duration: 110, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.85, duration: 110, useNativeDriver: true }),
        ]),
        // rest — diastole
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1.0,  duration: 490, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.55, duration: 490, useNativeDriver: true }),
        ]),
      ]).start(({ finished }) => { if (finished) beat(); });
    };
    beat();
    return () => { scale.stopAnimation(); opacity.stopAnimation(); };
  }, []);

  return (
    <Animated.Text style={[
      styles.heartGlyph,
      { color: `rgba(${accentRgb}, 1)`, opacity, transform: [{ scale }] },
    ]}>
      ..: :..
    </Animated.Text>
  );
}

// ── Gentle privacy rings — three concentric, pulse inward slowly ───────────
function GardenRings({ accentRgb }: { accentRgb: string }) {
  const r1 = useRef(new Animated.Value(0)).current;
  const r2 = useRef(new Animated.Value(0)).current;
  const r3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ring = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 1800, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
        ])
      );

    const l1 = ring(r1, 0);
    const l2 = ring(r2, 600);
    const l3 = ring(r3, 1200);
    l1.start(); l2.start(); l3.start();
    return () => { r1.stopAnimation(); r2.stopAnimation(); r3.stopAnimation(); };
  }, []);

  const ringStyle = (anim: Animated.Value, size: number, border: string) => ({
    position: 'absolute' as const,
    width: size, height: size, borderRadius: size / 2,
    borderWidth: 1,
    borderColor: border,
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.28] }),
  });

  return (
    <View style={styles.ringsWrap}>
      <Animated.View style={ringStyle(r1, 200, `rgba(${accentRgb}, 0.8)`)} />
      <Animated.View style={ringStyle(r2, 148, `rgba(${accentRgb}, 0.85)`)} />
      <Animated.View style={ringStyle(r3, 96,  `rgba(${accentRgb}, 0.9)`)} />
    </View>
  );
}

// ── Privacy items — garden metaphor language ───────────────────────────────
const PRIVACY_ITEMS = [
  { glyph: '🌱', label: 'Everything grows here, on this device alone. Nothing is planted in the cloud.' },
  { glyph: '🌿', label: 'No account. No identity required. No one knows you are here.' },
  { glyph: '🔒', label: 'Your sponsor only sees what you choose to share — check-ins you send.' },
  { glyph: '🌧', label: 'Mood logs and journal entries are like rain — they fall here and stay.' },
  { glyph: '🔥', label: 'The Burn Ritual returns everything to soil. Instant. Irreversible. Yours.' },
];

export default function Onboarding() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { theme, phase, phaseConfig } = useCircadian();

  const [step, setStep]           = useState<Step>('welcome');
  const [name, setName]           = useState('');
  const [substance, setSubstance] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dateConfirmed, setDateConfirmed] = useState(false);
  const [showPicker, setShowPicker]       = useState(false);
  const [notifStatus, setNotifStatus]     = useState<'pending' | 'granted' | 'denied'>('pending');
  const nameRef = useRef<TextInput>(null);

  // Step fade — smooth transition between steps
  const stepFade = useRef(new Animated.Value(1)).current;

  const goTo = (s: Step) => {
    Keyboard.dismiss();
    Haptics.selectionAsync();
    Animated.timing(stepFade, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setStep(s);
      Animated.timing(stepFade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    });
  };

  const goBack = () => {
    Keyboard.dismiss();
    Haptics.selectionAsync();
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) goTo(STEP_ORDER[idx - 1]);
    else router.back();
  };

  const requestNotifications = async () => {
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
    } catch { setNotifStatus('denied'); }
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
    const cleanName      = sanitizeName(name);
    const cleanSubstance = sanitizeSubstance(substance, SUBSTANCES);
    if (cleanName)      await Surface.setName(cleanName);
    if (cleanSubstance) await Surface.setSubstance(cleanSubstance);
    if (dateConfirmed) {
      const clamped = new Date(Math.min(selectedDate.getTime(), Date.now()));
      await Surface.setSobrietyStart(clamped.toISOString());
    }
    await Surface.setOnboarded();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(tabs)');
  };

  const topPad    = Platform.OS === 'web' ? 67 : insets.top + 16;
  const botPad    = Platform.OS === 'web' ? 34 : insets.bottom + 16;
  const showBack  = step !== 'welcome';
  const currentIdx = STEP_ORDER.indexOf(step);
  const showDots  = currentIdx >= 1 && currentIdx <= 5;

  const bgHex = theme.bg.replace('#', '');
  const bgN   = parseInt(bgHex, 16);
  const bgLum = 0.299 * ((bgN >> 16) & 255) + 0.587 * ((bgN >> 8) & 255) + 0.114 * (bgN & 255);
  const pickerVariant: 'dark' | 'light' = bgLum < 128 ? 'dark' : 'light';

  // Derive accent RGB from theme.accent for the heart and rings
  const hexToRgb = (hex: string) => {
    const n = parseInt(hex.replace('#', ''), 16);
    return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  };
  const accentRgb = hexToRgb(theme.accent);

  return (
    <Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }} accessible={false}>
      <View style={[styles.container, { backgroundColor: theme.bg, paddingTop: topPad, paddingBottom: botPad }]}>

        {/* Nav row */}
        <View style={styles.navRow}>
          {showBack ? (
            <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={12}>
              <Text style={[styles.backText, { color: `${theme.textMuted}80` }]}>← back</Text>
            </TouchableOpacity>
          ) : <View style={styles.backBtn} />}

          {showDots && (
            <View style={styles.dots}>
              {[1, 2, 3, 4, 5].map(i => (
                <View key={i} style={[
                  styles.dot,
                  { backgroundColor: currentIdx >= i ? theme.accent : `${theme.border}60` },
                ]} />
              ))}
            </View>
          )}
          <View style={styles.backBtn} />
        </View>

        <Animated.View style={[styles.stepWrap, { opacity: stepFade }]}>

          {/* ── WELCOME ── */}
          {step === 'welcome' && (
            <View style={styles.step}>
              {/* Heart + rings visual */}
              <View style={styles.heartArea}>
                <GardenRings accentRgb={accentRgb} />
                <RestingHeart accentRgb={accentRgb} />
              </View>

              <View style={styles.textBlock}>
                <Text style={[styles.title, { color: theme.text }]}>
                  you found the garden.
                </Text>
                <Text style={[styles.subtitle, { color: `${theme.textMuted}cc` }]}>
                  a sanctuary for your recovery.{'\n'}
                  private by nature.{'\n'}
                  yours alone.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.btn, { borderColor: `${theme.accent}70`, backgroundColor: `${theme.accent}12` }]}
                onPress={() => goTo('name')}
              >
                <Text style={[styles.btnText, { color: theme.accent }]}>step inside</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── NAME ── */}
          {step === 'name' && (
            <View style={styles.step}>
              <Text style={[styles.stepHint, { color: `${theme.accent}60` }]}>the garden greets you</Text>
              <Text style={[styles.question, { color: theme.text }]}>
                what do we call you here?
              </Text>
              <Text style={[styles.hint, { color: `${theme.textMuted}90` }]}>
                a name, a nickname — anything you like.{'\n'}
                stored only on this device.
              </Text>

              <View style={styles.inputRow}>
                <TextInput
                  ref={nameRef}
                  value={name}
                  onChangeText={setName}
                  placeholder="your name in the garden..."
                  placeholderTextColor={`${theme.textMuted}60`}
                  style={[styles.input, {
                    borderColor: name ? theme.accent : `${theme.border}80`,
                    color: theme.text,
                    backgroundColor: `${theme.surface}cc`,
                  }]}
                  autoFocus
                  returnKeyType="done"
                  blurOnSubmit
                  maxLength={40}
                  onSubmitEditing={() => goTo('substance')}
                />
                <TouchableOpacity
                  onPress={Keyboard.dismiss}
                  style={[styles.kbdDismiss, { borderColor: `${theme.border}60`, backgroundColor: `${theme.surface}cc` }]}
                >
                  <Text style={[styles.kbdDismissText, { color: `${theme.textMuted}80` }]}>⌄</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.btn, { borderColor: `${theme.accent}70`, backgroundColor: `${theme.accent}12` }]}
                onPress={() => goTo('substance')}
              >
                <Text style={[styles.btnText, { color: theme.accent }]}>continue</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => goTo('substance')} hitSlop={10}>
                <Text style={[styles.skip, { color: `${theme.textMuted}55` }]}>skip for now</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── SUBSTANCE ── */}
          {step === 'substance' && (
            <View style={styles.step}>
              <Text style={[styles.stepHint, { color: `${theme.accent}60` }]}>no judgement here</Text>
              <Text style={[styles.question, { color: theme.text }]}>
                what brought you to the garden?
              </Text>
              <Text style={[styles.hint, { color: `${theme.textMuted}90` }]}>
                never shared. helps the garden grow with you.
              </Text>

              <View style={styles.choices}>
                {SUBSTANCES.map(s => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => {
                      setSubstance(s);
                      Haptics.selectionAsync();
                      setTimeout(() => goTo('sobriety_date'), 240);
                    }}
                    style={[styles.choiceBtn, {
                      borderColor: substance === s ? theme.accent : `${theme.border}60`,
                      backgroundColor: substance === s ? `${theme.accent}14` : `${theme.surface}99`,
                    }]}
                  >
                    <Text style={[styles.choiceText, { color: substance === s ? theme.accent : theme.text }]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity onPress={() => goTo('sobriety_date')} hitSlop={10}>
                <Text style={[styles.skip, { color: `${theme.textMuted}55` }]}>prefer not to say</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── SOBRIETY DATE ── */}
          {step === 'sobriety_date' && (
            <View style={styles.step}>
              <Text style={[styles.stepHint, { color: `${theme.accent}60` }]}>planting the seed</Text>
              <Text style={[styles.question, { color: theme.text }]}>
                when did you plant your first seed?
              </Text>
              <Text style={[styles.hint, { color: `${theme.textMuted}90` }]}>
                the date your journey began.{'\n'}
                the garden counts every day since.
              </Text>

              <TouchableOpacity
                style={[styles.dateBtn, {
                  borderColor: dateConfirmed ? theme.accent : `${theme.border}60`,
                  backgroundColor: `${theme.surface}cc`,
                }]}
                onPress={() => { setShowPicker(v => !v); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.dateBtnLabel, { color: `${theme.textMuted}80` }]}>
                  {showPicker ? 'close calendar' : 'select your date'}
                </Text>
                <Text style={[styles.dateBtnValue, { color: dateConfirmed ? theme.accent : `${theme.textMuted}99` }]}>
                  {dateConfirmed ? formatDate(selectedDate) : 'choose a date →'}
                </Text>
              </TouchableOpacity>

              {showPicker && Platform.OS !== 'web' && (
                <View style={[styles.pickerWrap, { backgroundColor: `${theme.surface}ee`, borderColor: `${theme.border}60` }]}>
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                    maximumDate={new Date()}
                    onChange={(_e, date) => {
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
                <View style={[styles.pickerWrap, { borderColor: `${theme.border}60`, backgroundColor: `${theme.surface}ee` }]}>
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
                      if (!isNaN(d.getTime())) { setSelectedDate(d); setDateConfirmed(true); }
                    }}
                  />
                </View>
              )}

              <TouchableOpacity
                style={[styles.btn, {
                  borderColor: dateConfirmed ? `${theme.accent}70` : `${theme.border}40`,
                  backgroundColor: dateConfirmed ? `${theme.accent}12` : 'transparent',
                  opacity: dateConfirmed ? 1 : 0.45,
                }]}
                onPress={() => { if (dateConfirmed) goTo('privacy'); }}
                disabled={!dateConfirmed}
              >
                <Text style={[styles.btnText, { color: dateConfirmed ? theme.accent : theme.textMuted }]}>
                  the garden remembers
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => goTo('privacy')} hitSlop={10}>
                <Text style={[styles.skip, { color: `${theme.textMuted}55` }]}>i'll add this later</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── PRIVACY ── */}
          {step === 'privacy' && (
            <View style={styles.step}>
              <Text style={[styles.stepHint, { color: `${theme.accent}60` }]}>the garden walls</Text>
              <Text style={[styles.question, { color: theme.text }]}>
                nothing leaves here.
              </Text>
              <Text style={[styles.hint, { color: `${theme.textMuted}90` }]}>
                this is how the garden protects you.
              </Text>

              <View style={[styles.privacyCard, { backgroundColor: `${theme.surface}cc`, borderColor: `${theme.border}50` }]}>
                {PRIVACY_ITEMS.map((item, i) => (
                  <View key={i} style={[
                    styles.privacyRow,
                    i < PRIVACY_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: `${theme.border}35` },
                  ]}>
                    <Text style={styles.privacyGlyph}>{item.glyph}</Text>
                    <Text style={[styles.privacyLabel, { color: `${theme.text}dd` }]}>{item.label}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.btn, { borderColor: `${theme.accent}70`, backgroundColor: `${theme.accent}12` }]}
                onPress={() => goTo('notifications')}
              >
                <Text style={[styles.btnText, { color: theme.accent }]}>the garden has my trust</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── NOTIFICATIONS ── */}
          {step === 'notifications' && (
            <View style={styles.step}>
              <Text style={[styles.stepHint, { color: `${theme.accent}60` }]}>staying connected</Text>
              <Text style={[styles.question, { color: theme.text }]}>
                shall the garden call you back?
              </Text>
              <Text style={[styles.hint, { color: `${theme.textMuted}90` }]}>
                optional, gentle reminders.{'\n'}
                you can change this anytime.
              </Text>

              <View style={[styles.privacyCard, { backgroundColor: `${theme.surface}cc`, borderColor: `${theme.border}50` }]}>
                {[
                  { glyph: '🌅', label: 'a gentle daily check-in reminder' },
                  { glyph: '🦋', label: 'milestone celebrations as you grow' },
                  { glyph: '🌿', label: 'nothing from advertisers. ever.' },
                ].map((item, i) => (
                  <View key={i} style={[
                    styles.privacyRow,
                    i < 2 && { borderBottomWidth: 1, borderBottomColor: `${theme.border}35` },
                  ]}>
                    <Text style={styles.privacyGlyph}>{item.glyph}</Text>
                    <Text style={[styles.privacyLabel, { color: `${theme.text}dd` }]}>{item.label}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.btn, { borderColor: `${theme.accent}70`, backgroundColor: `${theme.accent}14` }]}
                onPress={requestNotifications}
              >
                <Text style={[styles.btnText, { color: theme.accent }]}>yes, remind me gently</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={skipNotifications} hitSlop={10}>
                <Text style={[styles.skip, { color: `${theme.textMuted}55` }]}>i'll find my own way back</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── READY ── */}
          {step === 'ready' && (
            <View style={styles.step}>
              {/* Same heart + rings as welcome — the garden is alive */}
              <View style={styles.heartArea}>
                <GardenRings accentRgb={accentRgb} />
                <RestingHeart accentRgb={accentRgb} />
              </View>

              <View style={styles.textBlock}>
                <Text style={[styles.title, { color: theme.text }]}>
                  {name ? `welcome, ${name.toLowerCase()}.` : 'welcome home.'}
                </Text>
                <Text style={[styles.subtitle, { color: `${theme.textMuted}cc` }]}>
                  {phaseConfig.description}
                </Text>
                {notifStatus === 'granted' && (
                  <Text style={[styles.notifNote, { color: `${theme.textMuted}70` }]}>
                    the garden will call you gently.
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.btn, { borderColor: `${theme.accent}70`, backgroundColor: `${theme.accent}14` }]}
                onPress={finish}
              >
                <Text style={[styles.btnText, { color: theme.accent }]}>enter the garden</Text>
              </TouchableOpacity>
            </View>
          )}

        </Animated.View>
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
  backText: { fontFamily: 'CourierPrime', fontSize: 12, letterSpacing: 1 },
  dots: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  stepWrap: { flex: 1 },
  step: { flex: 1, justifyContent: 'center', gap: 22 },

  // Heart visual
  heartArea: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringsWrap: {
    position: 'absolute',
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartGlyph: {
    fontFamily: 'CourierPrime',
    fontSize: 32,
    letterSpacing: 6,
    textAlign: 'center',
  },

  // Text
  stepHint: {
    fontFamily: 'CourierPrime',
    fontSize: 9,
    letterSpacing: 3,
    textTransform: 'lowercase',
    marginBottom: -12,
  },
  textBlock: { gap: 10 },
  title: {
    fontFamily: 'CourierPrime',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 0.3,
    lineHeight: 34,
    textTransform: 'lowercase',
  },
  subtitle: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    lineHeight: 22,
    textTransform: 'lowercase',
  },
  question: {
    fontFamily: 'CourierPrime',
    fontSize: 22,
    fontWeight: '700',
    textTransform: 'lowercase',
    lineHeight: 30,
  },
  hint: {
    fontFamily: 'CourierPrime',
    fontSize: 12,
    lineHeight: 19,
    textTransform: 'lowercase',
  },
  notifNote: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    lineHeight: 17,
    textTransform: 'lowercase',
    marginTop: 4,
  },

  // Input
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'CourierPrime',
    fontSize: 15,
    flex: 1,
  },
  kbdDismiss: {
    borderWidth: 1,
    borderRadius: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kbdDismissText: { fontSize: 20, lineHeight: 24 },

  // Buttons
  btn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: {
    fontFamily: 'CourierPrime',
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'lowercase',
  },
  skip: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 1.5,
    textAlign: 'center',
    textTransform: 'lowercase',
  },

  // Substance choices
  choices: { gap: 8 },
  choiceBtn: { borderWidth: 1, borderRadius: 8, padding: 13 },
  choiceText: { fontFamily: 'CourierPrime', fontSize: 14, textTransform: 'lowercase' },

  // Date picker
  dateBtn: { borderWidth: 1, borderRadius: 8, padding: 14, gap: 4 },
  dateBtnLabel: { fontFamily: 'CourierPrime', fontSize: 9, letterSpacing: 2.5, textTransform: 'lowercase' },
  dateBtnValue: { fontFamily: 'CourierPrime', fontSize: 15 },
  pickerWrap: { borderWidth: 1, borderRadius: 12, paddingVertical: 8 },

  // Privacy card
  privacyCard: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  privacyGlyph: { fontSize: 16, flexShrink: 0, marginTop: 1 },
  privacyLabel: { fontFamily: 'CourierPrime', fontSize: 12, lineHeight: 18, flex: 1, textTransform: 'lowercase' },
});
