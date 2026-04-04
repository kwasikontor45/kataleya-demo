'use no memo';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Animated,
  Easing,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCircadian } from '@/hooks/useCircadian';
import { useSobriety } from '@/hooks/useSobriety';
import { useOrchidSway } from '@/hooks/useOrchidSway';
import { useNotifications } from '@/hooks/useNotifications';
import { useResponsiveHeart } from '@/hooks/useResponsiveHeart';
import { DataBridge } from '@/components/DataBridge';
import { GhostPulseOrb } from '@/components/GhostPulseOrb';
import { NeonCard, NEON_RGB } from '@/components/NeonCard';
import { CircadianBadge } from '@/components/CircadianBadge';
import { BreathingExercise } from '@/components/BreathingExercise';
import { GroundingExercise } from '@/components/GroundingExercise';
import { TAB_BAR_HEIGHT } from '@/constants/circadian';
import { BLOOM_THRESHOLDS } from '@/utils/hapticBloom';
import { Surface, Sanctuary } from '@/utils/storage';

const pad = (n: number) => String(n).padStart(2, '0');

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function greetPhrase(phase: string): string {
  if (phase === 'dawn') return 'good morning';
  if (phase === 'day') return 'good afternoon';
  if (phase === 'goldenHour') return 'good evening';
  return 'good night';
}

// Circadian accent RGB — matches GhostPulseOrb color logic
function phaseAccentRgb(phase: string): string {
  if (phase === 'goldenHour') return NEON_RGB.amber;
  if (phase === 'night')      return NEON_RGB.violet;
  if (phase === 'dawn')       return NEON_RGB.pink;
  return NEON_RGB.cyan;
}

// Predictive suggestion — reads recent mood to surface a contextual nudge.
// Fully local: queries Sanctuary, no network.
async function getPredictiveSuggestion(phase: string): Promise<string | null> {
  try {
    const logs = await Sanctuary.getMoodLogs(20);
    if (logs.length < 5) return null;

    // Phase-specific average
    const phaseLogs = logs.filter(l => l.circadianPhase === phase);
    if (phaseLogs.length < 3) return null;

    const avg = phaseLogs.reduce((s, l) => s + l.moodScore, 0) / phaseLogs.length;
    const overall = logs.reduce((s, l) => s + l.moodScore, 0) / logs.length;

    if (avg < overall - 0.8) {
      const label = phase === 'goldenHour' ? 'golden hour' : phase === 'night' ? 'night' : phase === 'dawn' ? 'early morning' : 'afternoon';
      return `${label} has felt harder lately. want to breathe for a moment?`;
    }

    return null;
  } catch {
    return null;
  }
}

export default function SanctuaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, phase, phaseConfig } = useCircadian();
  const { sobriety, setStartDate } = useSobriety();
  const { restlessnessScore } = useOrchidSway();
  const { biometrics, systemState } = useResponsiveHeart(phase);
  useNotifications(sobriety.daysSober);

  const [showPrivacy, setShowPrivacy] = useState(false);
  const [settingDate, setSettingDate] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [showBreathing, setShowBreathing] = useState(false);
  const [showGrounding, setShowGrounding] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);

  // Day count pulse — gentle breath at BPM rate
  const dayPulse  = useRef(new Animated.Value(1)).current;
  // Heart pill — idle breath + panic intensify
  const pillPulse  = useRef(new Animated.Value(1)).current;
  const pillGlow   = useRef(new Animated.Value(0.4)).current;
  const ecgAnim    = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const breathe = () => {
      Animated.sequence([
        Animated.timing(dayPulse, {
          toValue: 1.04,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(dayPulse, {
          toValue: 1.0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => { if (finished) breathe(); });
    };
    breathe();
    return () => dayPulse.stopAnimation();
  }, [dayPulse]);

  // ECG sweep — runs continuously through the kataleya pill word
  // Mimics a heart-monitor line passing left to right then resetting
  useEffect(() => {
    const sweep = () => {
      ecgAnim.setValue(0);
      Animated.timing(ecgAnim, {
        toValue: 1,
        duration: 2800,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          setTimeout(sweep, 1200); // pause between sweeps
        }
      });
    };
    const t = setTimeout(sweep, 2000); // initial delay
    return () => clearTimeout(t);
  }, [ecgAnim]);

  // Heart pill idle animation — slow breath, 5.5s cycle
  // Lets the user sense it's interactive without demanding attention
  useEffect(() => {
    const idlePulse = () => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pillPulse, {
            toValue: 1.07,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pillGlow, {
            toValue: 0.75,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pillPulse, {
            toValue: 1.0,
            duration: 3500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pillGlow, {
            toValue: 0.4,
            duration: 3500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]).start(({ finished }) => { if (finished) idlePulse(); });
    };
    idlePulse();
    return () => { pillPulse.stopAnimation(); pillGlow.stopAnimation(); };
  }, [pillPulse, pillGlow]);

  const [pickerDate, setPickerDate] = useState<Date>(
    sobriety.startDate ? new Date(sobriety.startDate) : new Date()
  );
  const panicRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevDaysSober = useRef(sobriety.daysSober);

  useEffect(() => {
    Surface.getName().then(n => setUserName(n ?? null));
  }, []);

  // Load predictive suggestion once per mount
  useEffect(() => {
    getPredictiveSuggestion(phase).then(s => setSuggestion(s));
  }, [phase]);

  // Fire bloom haptic when milestone threshold is crossed
  useEffect(() => {
    if (!sobriety.loaded) return;
    const prev = prevDaysSober.current;
    const curr = sobriety.daysSober;
    if (curr !== prev) {
      for (const threshold of BLOOM_THRESHOLDS) {
        if (prev < threshold.days && curr >= threshold.days) {
          threshold.fire();
          break;
        }
      }
      prevDaysSober.current = curr;
    }
  }, [sobriety.daysSober, sobriety.loaded]);

  const handlePanicStart = () => {
    // Intensify the pill animation as a hold indicator
    Animated.parallel([
      Animated.timing(pillPulse, {
        toValue: 1.18,
        duration: 1400,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(pillGlow, {
        toValue: 1.0,
        duration: 1400,
        useNativeDriver: true,
      }),
    ]).start();
    panicRef.current = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      router.push('/cover');
    }, 1500);
  };

  const handlePanicEnd = () => {
    if (panicRef.current) clearTimeout(panicRef.current);
    // Reset pill back to idle breath
    Animated.parallel([
      Animated.timing(pillPulse, { toValue: 1.0, duration: 400, useNativeDriver: true }),
      Animated.timing(pillGlow,  { toValue: 0.4, duration: 400, useNativeDriver: true }),
    ]).start();
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + TAB_BAR_HEIGHT : insets.bottom + TAB_BAR_HEIGHT;

  const bgLum = (() => {
    const n = parseInt(theme.bg.replace('#', ''), 16);
    return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  })();
  const pickerVariant: 'dark' | 'light' = bgLum < 128 ? 'dark' : 'light';

  const handleConfirmDate = async () => {
    await setStartDate(pickerDate.toISOString());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSettingDate(false);
  };

  const accentRgb = phaseAccentRgb(phase);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Ambient top glow — circadian color */}
      <View
        style={[
          styles.ambientGlow,
          { backgroundColor: `rgba(${accentRgb}, 0.04)` },
        ]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: botPad + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Greeting */}
        {userName ? (
          <Text style={[styles.greeting, { color: `rgba(${accentRgb}, 0.65)` }]}>
            {greetPhrase(phase)}, {userName.toLowerCase()}
          </Text>
        ) : null}

        {/* ── HEADER — three pills, full-width, space-between ── */}
        <View style={styles.header}>

          {/* Left pill — "kataleya" with ECG sweep + tap opens privacy modal */}
          <TouchableOpacity
            onPressIn={handlePanicStart}
            onPressOut={handlePanicEnd}
            onPress={() => setShowPrivacy(true)}
            activeOpacity={0.85}
            hitSlop={8}
            style={styles.logoContainer}
          >
            <Animated.View style={[
              styles.heartPill,
              {
                borderColor: pillGlow.interpolate({
                  inputRange: [0.4, 1.0],
                  outputRange: [`rgba(${accentRgb}, 0.32)`, `rgba(${accentRgb}, 0.82)`],
                }),
                transform: [{ scale: pillPulse }],
              },
            ]}>
              {/* ECG sweep overlay — a moving highlight passes through the text */}
              <View style={styles.pillInner}>
                <Text style={[styles.heartPillGlyph, { color: `rgba(${accentRgb}, 0.88)` }]}>
                  kataleya
                </Text>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.ecgSweep,
                    {
                      left: ecgAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['-100%', '200%'],
                      }),
                      backgroundColor: `rgba(${accentRgb}, 0.18)`,
                    },
                  ]}
                />
              </View>
            </Animated.View>
          </TouchableOpacity>

          {/* Centre pill — circadian phase */}
          <CircadianBadge theme={theme} phaseConfig={phaseConfig} />

        </View>

        {/* ── GHOST PULSE ORB — replaces OrchidProgress ── */}
        <View style={styles.orbSection}>
          <GhostPulseOrb
            theme={theme}
            phase={phase}
            daysSober={sobriety.daysSober}
            restlessnessScore={restlessnessScore}
            systemState={systemState}
            bpm={biometrics.bpm}
          />
        </View>

        {/* Timer */}
        {sobriety.startDate ? (
          <View style={styles.timerSection}>
            <Animated.Text style={[styles.dayCount, { color: `rgba(${accentRgb}, 0.95)`, transform: [{ scale: dayPulse }] }]}>
              {sobriety.daysSober}
            </Animated.Text>
            <Text style={[styles.dayLabel, { color: `rgba(${accentRgb}, 0.45)` }]}>
              days in sanctuary
            </Text>
            <Text style={[styles.hmsCount, { color: `${theme.text}60` }]}>
              {pad(sobriety.hoursSober)}:{pad(sobriety.minutesSober)}:{pad(sobriety.secondsSober)}
            </Text>

            {sobriety.nextMilestone && (
              <View style={styles.progressSection}>
                <View style={[styles.progressTrack, { backgroundColor: `rgba(${accentRgb}, 0.12)` }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${sobriety.progressToNext * 100}%`,
                        backgroundColor: `rgba(${accentRgb}, 0.7)`,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.nextLabel, { color: `rgba(${accentRgb}, 0.45)` }]}>
                  {sobriety.nextMilestone.days - sobriety.daysSober} days to{' '}
                  <Text style={{ color: `rgba(${accentRgb}, 0.8)` }}>
                    {sobriety.nextMilestone.label}
                  </Text>
                </Text>
              </View>
            )}

            {!sobriety.nextMilestone && (
              <Text style={[styles.nextLabel, { color: `rgba(${accentRgb}, 0.6)` }]}>
                ∞ all milestones achieved
              </Text>
            )}

            <TouchableOpacity onPress={() => setSettingDate(v => !v)} style={styles.adjustBtn}>
              <Text style={[styles.adjustText, { color: `${theme.textMuted}70` }]}>
                {settingDate ? 'cancel' : 'adjust date'}
              </Text>
            </TouchableOpacity>

            {settingDate && (
              <View style={styles.datePickerArea}>
                {Platform.OS !== 'web' ? (
                  <View style={[styles.pickerCard, { backgroundColor: theme.surface, borderColor: `rgba(${accentRgb}, 0.2)` }]}>
                    <DateTimePicker
                      value={pickerDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                      maximumDate={new Date()}
                      onChange={(_e, date) => {
                        if (date) {
                          setPickerDate(date);
                          if (Platform.OS === 'android') handleConfirmDate();
                        }
                      }}
                      themeVariant={pickerVariant}
                      accentColor={theme.accent}
                    />
                  </View>
                ) : (
                  <View style={[styles.webDateCard, { backgroundColor: theme.surface, borderColor: `rgba(${accentRgb}, 0.2)` }]}>
                    <Text style={[styles.webDateLabel, { color: theme.textMuted }]}>select date</Text>
                    <input
                      type="date"
                      defaultValue={pickerDate.toISOString().split('T')[0]}
                      max={new Date().toISOString().split('T')[0]}
                      style={{
                        background: 'transparent', border: 'none',
                        color: theme.text, fontFamily: 'CourierPrime',
                        fontSize: 16, width: '100%', outline: 'none', padding: '4px 0',
                      }}
                      onChange={(e) => {
                        const d = new Date(e.target.value);
                        if (!isNaN(d.getTime())) setPickerDate(d);
                      }}
                    />
                  </View>
                )}
                {(Platform.OS === 'ios' || Platform.OS === 'web') && (
                  <View style={styles.pickerFooter}>
                    {Platform.OS === 'ios' && (
                      <Text style={[styles.pickerSelected, { color: theme.textMuted }]}>
                        {formatDate(pickerDate)}
                      </Text>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.confirmBtn,
                        {
                          borderColor: `rgba(${accentRgb}, 0.4)`,
                          backgroundColor: `rgba(${accentRgb}, 0.1)`,
                          flex: Platform.OS === 'ios' ? 0 : 1,
                        },
                      ]}
                      onPress={handleConfirmDate}
                    >
                      <Text style={[styles.confirmBtnText, { color: `rgba(${accentRgb}, 0.9)` }]}>
                        confirm
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          // No date set — garden waiting state
          <View style={styles.setupSection}>
            <Text style={[styles.setupTitle, { color: `rgba(${accentRgb}, 0.55)` }]}>
              the garden waits for you.
            </Text>
            <Text style={[styles.setupHint, { color: `${theme.textMuted}60` }]}>
              when you're ready, set your date below.
            </Text>
            {!settingDate ? (
              <TouchableOpacity
                style={[
                  styles.enterBtn,
                  {
                    borderColor: `rgba(${accentRgb}, 0.35)`,
                    backgroundColor: `rgba(${accentRgb}, 0.08)`,
                  },
                ]}
                onPress={() => setSettingDate(true)}
              >
                <Text style={[styles.enterBtnText, { color: `rgba(${accentRgb}, 0.85)` }]}>
                  begin tracking
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.datePickerArea}>
                {Platform.OS !== 'web' ? (
                  <View style={[styles.pickerCard, { backgroundColor: theme.surface, borderColor: `rgba(${accentRgb}, 0.2)` }]}>
                    <DateTimePicker
                      value={pickerDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                      maximumDate={new Date()}
                      onChange={(_e, date) => {
                        if (date) {
                          setPickerDate(date);
                          if (Platform.OS === 'android') handleConfirmDate();
                        }
                      }}
                      themeVariant={pickerVariant}
                      accentColor={theme.accent}
                    />
                  </View>
                ) : (
                  <View style={[styles.webDateCard, { backgroundColor: theme.surface, borderColor: `rgba(${accentRgb}, 0.2)` }]}>
                    <Text style={[styles.webDateLabel, { color: theme.textMuted }]}>select date</Text>
                    <input
                      type="date"
                      defaultValue={pickerDate.toISOString().split('T')[0]}
                      max={new Date().toISOString().split('T')[0]}
                      style={{
                        background: 'transparent', border: 'none',
                        color: theme.text, fontFamily: 'CourierPrime',
                        fontSize: 16, width: '100%', outline: 'none', padding: '4px 0',
                      }}
                      onChange={(e) => {
                        const d = new Date(e.target.value);
                        if (!isNaN(d.getTime())) setPickerDate(d);
                      }}
                    />
                  </View>
                )}
                <View style={styles.pickerFooter}>
                  <TouchableOpacity
                    style={[
                      styles.confirmBtn,
                      {
                        borderColor: `rgba(${accentRgb}, 0.4)`,
                        backgroundColor: `rgba(${accentRgb}, 0.1)`,
                        flex: 1,
                      },
                    ]}
                    onPress={handleConfirmDate}
                  >
                    <Text style={[styles.confirmBtnText, { color: `rgba(${accentRgb}, 0.9)` }]}>
                      confirm
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setSettingDate(false)}>
                  <Text style={[styles.adjustText, { color: `${theme.textMuted}70` }]}>cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── PREDICTIVE SUGGESTION — from base44 PredictiveSuggestion ── */}
        {suggestion && !suggestionDismissed && (
          <NeonCard
            theme={theme}
            accentRgb={accentRgb}
            borderIntensity={0.22}
            fillIntensity={0.07}
            style={styles.suggestionCard}
          >
            <View style={styles.suggestionInner}>
              <View style={styles.suggestionText}>
                <Text style={[styles.suggestionLabel, { color: `rgba(${accentRgb}, 0.55)` }]}>
                  pattern
                </Text>
                <Text style={[styles.suggestionBody, { color: `${theme.text}cc` }]}>
                  {suggestion}
                </Text>
              </View>
              <View style={styles.suggestionActions}>
                <TouchableOpacity
                  onPress={() => { setShowBreathing(true); setSuggestionDismissed(true); }}
                >
                  <Text style={[styles.suggestionAction, { color: `rgba(${accentRgb}, 0.85)` }]}>
                    breathe
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setSuggestionDismissed(true)}>
                  <Text style={[styles.suggestionDismiss, { color: `${theme.textMuted}55` }]}>
                    ×
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </NeonCard>
        )}

        {/* ── MINDFULNESS TILES — NeonCard grid ── */}
        <View style={styles.mindfulSection}>
          <Text style={[styles.mindfulLabel, { color: `rgba(${accentRgb}, 0.35)` }]}>
            mindfulness
          </Text>
          <View style={styles.mindfulRow}>
            <NeonCard
              theme={theme}
              glowColor="cyan"
              style={styles.mindfulCard}
              onPress={() => setShowBreathing(true)}
            >
              <Text style={[styles.mindfulGlyph, { color: `rgba(${NEON_RGB.cyan}, 0.85)` }]}>◎</Text>
              <Text style={[styles.mindfulCardTitle, { color: `rgba(${NEON_RGB.cyan}, 0.9)` }]}>
                breathe
              </Text>
              <Text style={[styles.mindfulCardSub, { color: `rgba(${NEON_RGB.cyan}, 0.4)` }]}>
                4 — 7 — 8
              </Text>
            </NeonCard>

            <NeonCard
              theme={theme}
              glowColor="violet"
              style={styles.mindfulCard}
              onPress={() => setShowGrounding(true)}
            >
              <Text style={[styles.mindfulGlyph, { color: `rgba(${NEON_RGB.violet}, 0.85)` }]}>⟡</Text>
              <Text style={[styles.mindfulCardTitle, { color: `rgba(${NEON_RGB.violet}, 0.9)` }]}>
                ground
              </Text>
              <Text style={[styles.mindfulCardSub, { color: `rgba(${NEON_RGB.violet}, 0.4)` }]}>
                5 — 4 — 3 — 2 — 1
              </Text>
            </NeonCard>
          </View>
        </View>

        {/* DataBridge + phase description */}
        <View style={styles.heartSection}>
          <DataBridge phase={phase} theme={theme} size="large" />
          <Text style={[styles.phaseDesc, { color: `${theme.textMuted}80` }]}>
            {phaseConfig.description}
          </Text>
          <TouchableOpacity onPress={() => router.push('/privacy')} hitSlop={8}>
            <Text style={[styles.privacyLink, { color: `${theme.textMuted}40` }]}>privacy</Text>
          </TouchableOpacity>
          <Text style={[styles.wordmark, { color: `${theme.textMuted}22` }]}>kataleya</Text>
        </View>
      </ScrollView>

      <BreathingExercise
        visible={showBreathing}
        onClose={() => setShowBreathing(false)}
        theme={theme}
      />
      <GroundingExercise
        visible={showGrounding}
        onClose={() => setShowGrounding(false)}
        theme={theme}
      />

      {/* ── PRIVACY MODAL — slides up from bottom on kataleya tap ── */}
      <Modal
        visible={showPrivacy}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setShowPrivacy(false)}
      >
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={styles.privacyBackdrop}
            activeOpacity={1}
            onPress={() => setShowPrivacy(false)}
          />
          <View style={[styles.privacySheet, { backgroundColor: theme.bg, borderColor: `rgba(${accentRgb}, 0.2)` }]}>
            <View style={[styles.sheetHandle, { backgroundColor: `rgba(${accentRgb}, 0.3)` }]} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
              <Text style={[styles.sheetEyebrow, { color: `rgba(${accentRgb}, 0.5)` }]}>
                the garden walls
              </Text>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                your data is yours.
              </Text>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                completely.
              </Text>
              <Text style={[styles.sheetSubtitle, { color: `${theme.textMuted}bb` }]}>
                kataleya was designed to know as little about you as possible.
                here is exactly what that means.
              </Text>

              {[
                {
                  label: 'what lives only on this device',
                  glyph: '🌱',
                  items: [
                    'your sobriety start date',
                    'every mood log — score, phase, optional note',
                    'every journal entry — sealed, never transmitted',
                    'your name or nickname',
                    'growth milestones and recovery stage',
                    'circadian history used for local insights only',
                    'sponsor credentials — held in the OS keychain',
                  ],
                },
                {
                  label: 'what your sponsor sees',
                  glyph: '🌿',
                  items: [
                    'daily check-in: yes or no — nothing else',
                    'your recovery stage — a single word',
                    'number of milestones reached — a number',
                    'presence signals you choose to send (water, light)',
                    'they cannot see mood logs, journal, sobriety date, or any health data',
                  ],
                },
                {
                  label: 'messages',
                  glyph: '🔒',
                  items: [
                    'end-to-end encrypted — the relay sees only ciphertext',
                    'keys are generated on your device and never leave it',
                    'messages are relayed and discarded — not stored',
                  ],
                },
                {
                  label: 'the burn ritual',
                  glyph: '🔥',
                  items: [
                    'erases all three vaults — SQLite, AsyncStorage, OS keychain',
                    'if interrupted, next launch completes the wipe automatically',
                    'after a clean burn, kataleya has no memory of you',
                  ],
                },
                {
                  label: 'third parties',
                  glyph: '🌧',
                  items: [
                    'no analytics. no crash reporter. no advertising network.',
                    'no Firebase, Amplitude, Sentry, or Mixpanel.',
                    'expo device APIs do not transmit your data.',
                  ],
                },
              ].map((section, si) => (
                <View key={si} style={styles.sheetSection}>
                  <View style={styles.sheetSectionHeader}>
                    <Text style={styles.sheetGlyph}>{section.glyph}</Text>
                    <Text style={[styles.sheetSectionTitle, { color: `rgba(${accentRgb}, 0.7)` }]}>
                      {section.label}
                    </Text>
                  </View>
                  {section.items.map((item, ii) => (
                    <View key={ii} style={styles.sheetItemRow}>
                      <Text style={[styles.sheetBullet, { color: `rgba(${accentRgb}, 0.4)` }]}>·</Text>
                      <Text style={[styles.sheetItem, { color: `${theme.text}cc` }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              ))}

              <Text style={[styles.sheetFooter, { color: `${theme.textMuted}55` }]}>
                last reviewed april 2026 · privacy@kataleya.app
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  ambientGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 320,
    pointerEvents: 'none',
  },
  scroll: { paddingHorizontal: 24, alignItems: 'center', gap: 8 },
  greeting: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'lowercase',
    width: '100%',
    marginBottom: 2,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  // Left pill — heart glyph only, no label
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  heartPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heartPillGlyph: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 3,
  },
  // Kataleya wordmark — barely visible at bottom of scroll
  // ECG pill
  pillInner: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ecgSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '40%',
    opacity: 1,
  },
  // Privacy modal
  privacyBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  privacySheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '85%',
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 20,
  },
  sheetScroll: { paddingHorizontal: 24, paddingBottom: 40, gap: 0 },
  sheetEyebrow: {
    fontFamily: 'CourierPrime', fontSize: 9,
    letterSpacing: 3, textTransform: 'lowercase', marginBottom: 8,
  },
  sheetTitle: {
    fontFamily: 'CourierPrime', fontSize: 22,
    fontWeight: '700', lineHeight: 30, marginBottom: 10,
  },
  sheetSubtitle: {
    fontFamily: 'CourierPrime', fontSize: 12,
    lineHeight: 19, marginBottom: 24,
  },
  sheetSection: { marginBottom: 20 },
  sheetSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sheetGlyph: { fontSize: 14 },
  sheetSectionTitle: {
    fontFamily: 'CourierPrime', fontSize: 10,
    letterSpacing: 2, textTransform: 'lowercase', fontWeight: '700',
  },
  sheetItemRow: { flexDirection: 'row', gap: 8, marginBottom: 5, paddingLeft: 22 },
  sheetBullet: { fontFamily: 'CourierPrime', fontSize: 12, lineHeight: 19 },
  sheetItem: { fontFamily: 'CourierPrime', fontSize: 12, lineHeight: 19, flex: 1 },
  sheetFooter: {
    fontFamily: 'CourierPrime', fontSize: 9,
    letterSpacing: 1.5, textAlign: 'center', marginTop: 16,
  },
  wordmark: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 8,
    textTransform: 'lowercase',
    marginTop: 8,
  },
  orbSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  timerSection: { alignItems: 'center', gap: 6, width: '100%' },
  dayCount: {
    fontFamily: 'CourierPrime',
    fontSize: 64,
    fontWeight: '700',
    lineHeight: 72,
    letterSpacing: -1,
  },
  dayLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  hmsCount: {
    fontFamily: 'CourierPrime',
    fontSize: 20,
    letterSpacing: 2,
    marginTop: 2,
  },
  progressSection: { width: '100%', gap: 8, marginTop: 12 },
  progressTrack: { height: 2, borderRadius: 1, width: '100%', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 1 },
  nextLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 1,
    textAlign: 'center',
  },
  adjustBtn: { marginTop: 8 },
  adjustText: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'lowercase',
    textAlign: 'center',
  },
  datePickerArea: { width: '100%', gap: 10, marginTop: 4 },
  pickerCard: { borderWidth: 1, borderRadius: 12, paddingVertical: 8 },
  webDateCard: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  webDateLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  pickerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  pickerSelected: { fontFamily: 'CourierPrime', fontSize: 12, letterSpacing: 0.5 },
  confirmBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'lowercase',
  },
  setupSection: { alignItems: 'center', gap: 10, width: '100%' },
  setupTitle: {
    fontFamily: 'CourierPrime',
    fontSize: 15,
    letterSpacing: 1,
    textTransform: 'lowercase',
    textAlign: 'center',
  },
  setupHint: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  enterBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 28,
    alignItems: 'center',
    width: '100%',
  },
  enterBtnText: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'lowercase',
  },
  // Predictive suggestion card
  suggestionCard: { width: '100%', marginTop: 4 },
  suggestionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  suggestionText: { flex: 1, gap: 3 },
  suggestionLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 9,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  suggestionBody: {
    fontFamily: 'CourierPrime',
    fontSize: 12,
    letterSpacing: 0.4,
    lineHeight: 18,
  },
  suggestionActions: { alignItems: 'center', gap: 8 },
  suggestionAction: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'lowercase',
  },
  suggestionDismiss: {
    fontFamily: 'CourierPrime',
    fontSize: 16,
    lineHeight: 18,
  },
  // Mindfulness tiles
  mindfulSection: { width: '100%', gap: 10, marginTop: 8 },
  mindfulLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 9,
    letterSpacing: 3,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  mindfulRow: { flexDirection: 'row', gap: 10 },
  mindfulCard: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 6,
  },
  mindfulGlyph: { fontSize: 24, lineHeight: 28 },
  mindfulCardTitle: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'lowercase',
    fontWeight: '700',
  },
  mindfulCardSub: {
    fontFamily: 'CourierPrime',
    fontSize: 9,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  // DataBridge section
  heartSection: {
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingBottom: 8,
    width: '100%',
  },
  phaseDesc: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 1,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  privacyLink: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'lowercase',
    marginTop: 4,
  },
});
