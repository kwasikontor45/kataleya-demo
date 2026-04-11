'use no memo';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Dimensions,
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
import { GhostPulseOrb } from '@/components/GhostPulseOrb';
import { OuroborosRing } from '@/components/OuroborosRing';
import { NeonCard, NEON_RGB } from '@/components/NeonCard';
import { CircadianBadge } from '@/components/CircadianBadge';
import { GlyphIcon } from '@/components/GlyphIcon';
import { BreathingExercise } from '@/components/BreathingExercise';
import { GroundingExercise } from '@/components/GroundingExercise';
import { TAB_BAR_HEIGHT } from '@/constants/circadian';
import { BLOOM_THRESHOLDS } from '@/utils/hapticBloom';
import { Surface, Sanctuary } from '@/utils/storage';
import { useUserState } from '@/hooks/use-user-state';

const SCREEN_W = Dimensions.get('window').width;
const ORB_COMPOSITE = Math.min(SCREEN_W * 0.72, 260);

const pad = (n: number) => String(n).padStart(2, '0');

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function greetPhrase(phase: string): string {
  if (phase === 'dawn')        return 'good morning';
  if (phase === 'day')         return 'good afternoon';
  if (phase === 'goldenHour')  return 'good evening';
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
  const { theme, phase, phaseConfig, darkOverride, setDarkOverride } = useCircadian();
  const { sobriety, setStartDate } = useSobriety();
  const { state: userState } = useUserState(phase, sobriety.daysSober);
  const { restlessnessScore } = useOrchidSway();
  const { biometrics, systemState } = useResponsiveHeart(phase);
  useNotifications(sobriety.daysSober);

  const [settingDate, setSettingDate] = useState(false);
  const [showPrivacy, setShowPrivacy]   = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [showBreathing, setShowBreathing] = useState(false);
  const [showGrounding, setShowGrounding] = useState(false);
  const [overrideHint, setOverrideHint] = useState(false);
  const overrideHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);

  // Day count pulse — gentle breath at BPM rate
  const dayPulse  = useRef(new Animated.Value(1)).current;
  // Heart pill — idle breath + panic intensify
  const pillPulse  = useRef(new Animated.Value(1)).current;
  const pillGlow   = useRef(new Animated.Value(0.4)).current;
  const ecgAnim    = useRef(new Animated.Value(0)).current;
  const orbHint      = useRef(new Animated.Value(0)).current;
  const wordmarkPulse = useRef(new Animated.Value(0.3)).current;
  const ambientGlow   = useRef(new Animated.Value(0)).current;
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

  // Wordmark pulse — breathes between dim and legible to signal interactivity
  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(wordmarkPulse, {
          toValue: 0.55,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(wordmarkPulse, {
          toValue: 0.22,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]).start(({ finished }) => { if (finished) pulse(); });
    };
    const t = setTimeout(pulse, 3000);
    return () => clearTimeout(t);
  }, [wordmarkPulse]);

  // Ambient glow — 12s breath cycle, behind everything
  // Slower than the orb. The environment breathes, not performs.
  useEffect(() => {
    const breathe = () => {
      Animated.sequence([
        Animated.timing(ambientGlow, {
          toValue: 1,
          duration: 6000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(ambientGlow, {
          toValue: 0,
          duration: 6000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]).start(({ finished }) => { if (finished) breathe(); });
    };
    const t = setTimeout(breathe, 800);
    return () => clearTimeout(t);
  }, [ambientGlow]);

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
  const hour = new Date().getHours();
  const is2am = phase === 'night' && hour >= 0 && hour < 5;
  const isStruggling = userState === 'struggling' || userState === 'rest';

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Ambient breathing glow — the environment is alive */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ambientGlow,
          {
            backgroundColor: ambientGlow.interpolate({
              inputRange:  [0, 1],
              outputRange: [`rgba(${accentRgb}, 0.02)`, `rgba(${accentRgb}, 0.06)`],
            }),
          },
        ]}
      />
      {/* Deep radial — centered on orb, slower and wider */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ambientRadial,
          {
            opacity: ambientGlow.interpolate({
              inputRange:  [0, 1],
              outputRange: [0.0, 0.55],
            }),
            backgroundColor: `rgba(${accentRgb}, 0.04)`,
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: botPad + 16 },
        ]}
        scrollEnabled={true}
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

          {/* Left pill — "kataleya" ECG sweep — long-press = panic/cover screen */}
          <TouchableOpacity
            onPressIn={handlePanicStart}
            onPressOut={handlePanicEnd}
            activeOpacity={1}
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

          {/* Centre pill — circadian phase + tap to force override */}
          {overrideHint && (
            <View style={{ position: 'absolute', top: 36, alignSelf: 'center', zIndex: 10 }}>
              <Text style={{ fontFamily: 'SpaceMono', fontSize: 9, letterSpacing: 1.5, color: `rgba(${accentRgb},0.6)` }}>
                {darkOverride ? 'following circadian rhythm' : 'night mode on'}
              </Text>
            </View>
          )}
          <TouchableOpacity
            onPress={() => {
              setDarkOverride(!darkOverride);
              setOverrideHint(true);
              if (overrideHintTimer.current) clearTimeout(overrideHintTimer.current);
              overrideHintTimer.current = setTimeout(() => setOverrideHint(false), 2500);
            }}
            activeOpacity={0.75}
            hitSlop={8}
          >
            <View style={[styles.circadianPill, {
              borderColor: darkOverride
                ? `rgba(${accentRgb}, 0.7)`
                : `rgba(${accentRgb}, 0.5)`,
              backgroundColor: darkOverride ? `rgba(${accentRgb}, 0.08)` : 'transparent',
            }]}>
              <Text style={[styles.circadianPillText, { color: darkOverride ? `rgba(${accentRgb}, 0.9)` : theme.accent }]}>
                {darkOverride ? '◗ ' : ''}{phaseConfig.displayName}
              </Text>
            </View>
          </TouchableOpacity>

        </View>

        {/* ── GHOST PULSE ORB + OUROBOROS RING — snake encircles butterfly ── */}
        <View style={styles.orbSection}>
          <TouchableOpacity
            activeOpacity={is2am ? 0.7 : 1}
            onPress={is2am ? () => router.push('/cover') : undefined}
            style={styles.orbComposite}
          >
            {/* OuroborosRing — outer, slow, scarred by time */}
            <View style={styles.ouroborosWrap} pointerEvents="none">
              <OuroborosRing
                size={ORB_COMPOSITE}
                color={theme.accent}
                cycleCount={sobriety.daysSober}
                phase={phase as any}
                breathing={true}
              />
            </View>
            {/* GhostPulseOrb — inner, the butterfly */}
            <View style={styles.orbInner}>
              <GhostPulseOrb
                theme={theme}
                phase={phase}
                daysSober={sobriety.daysSober}
                restlessnessScore={restlessnessScore}
                systemState={systemState}
                bpm={biometrics.bpm}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* 2am moment — void phase between midnight and 5am */}
        {is2am && (
          <TouchableOpacity
            onPress={() => router.push('/cover')}
            activeOpacity={0.7}
            style={styles.amPromptWrap}
          >
            <Text style={[styles.amPromptText, { color: `rgba(${accentRgb},0.45)` }]}>
              the garden is open
            </Text>
            <Text style={[styles.amPromptSub, { color: `rgba(${accentRgb},0.22)` }]}>
              tap to enter
            </Text>
          </TouchableOpacity>
        )}

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

        {/* ── PREDICTIVE SUGGESTION — ambient strip, no card ── */}
        {suggestion && !suggestionDismissed && (
          <View style={styles.suggestionStrip}>
            <Text style={[styles.suggestionBody, { color: `${theme.textMuted}99`, flex: 1 }]} numberOfLines={2}>
              {suggestion}
            </Text>
            <TouchableOpacity onPress={() => { setShowBreathing(true); setSuggestionDismissed(true); }}>
              <Text style={[styles.suggestionAction, { color: `rgba(${accentRgb}, 0.8)` }]}>breathe</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSuggestionDismissed(true)} hitSlop={8}>
              <Text style={[styles.suggestionDismiss, { color: `${theme.textMuted}55` }]}>×</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── QUICK-SLOTS — Cyberpunk ── */}
        <View style={styles.quickSlotSection}>
          <View style={[styles.quickSlotRow, isStruggling && { opacity: 0.5 }]}>
            <TouchableOpacity
              style={[styles.quickSlot, { borderColor: `rgba(${NEON_RGB.cyan},0.22)`, backgroundColor: `rgba(${NEON_RGB.cyan},0.04)` }]}
              onPress={() => setShowBreathing(true)}
              activeOpacity={0.75}
            >
              <Text style={[styles.quickSlotGlyph, { color: `rgba(${NEON_RGB.cyan},0.45)` }]}>◎</Text>
              <Text style={[styles.quickSlotLabel, { color: `rgba(${NEON_RGB.cyan},0.55)` }]}>breathe</Text>
              <Text style={[styles.quickSlotSub, { color: `rgba(${NEON_RGB.cyan},0.25)` }]}>4·7·8</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickSlot, { borderColor: `rgba(${NEON_RGB.violet},0.22)`, backgroundColor: `rgba(${NEON_RGB.violet},0.04)` }]}
              onPress={() => setShowGrounding(true)}
              activeOpacity={0.75}
            >
              <Text style={[styles.quickSlotGlyph, { color: `rgba(${NEON_RGB.violet},0.45)` }]}>⟡</Text>
              <Text style={[styles.quickSlotLabel, { color: `rgba(${NEON_RGB.violet},0.55)` }]}>ground</Text>
              <Text style={[styles.quickSlotSub, { color: `rgba(${NEON_RGB.violet},0.25)` }]}>5·4·3·2·1</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickSlot, { borderColor: `rgba(${NEON_RGB.amber},0.22)`, backgroundColor: `rgba(${NEON_RGB.amber},0.04)` }]}
              onPress={() => router.push('/cover')}
              activeOpacity={0.75}
            >
              <Text style={[styles.quickSlotGlyph, { color: `rgba(${NEON_RGB.amber},0.45)` }]}>◬</Text>
              <Text style={[styles.quickSlotLabel, { color: `rgba(${NEON_RGB.amber},0.55)` }]}>sanctuary</Text>
              <Text style={[styles.quickSlotSub, { color: `rgba(${NEON_RGB.amber},0.25)` }]}>2am</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setShowPrivacy(true)} hitSlop={16} activeOpacity={0.7}>
            <Animated.Text style={[styles.wordmark, { color: theme.textMuted, opacity: wordmarkPulse }]}>
              kataleya
            </Animated.Text>
          </TouchableOpacity>
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
            <View style={styles.sheetTopRow}>
              <View style={[styles.sheetHandle, { backgroundColor: `rgba(${accentRgb}, 0.3)` }]} />
              <TouchableOpacity onPress={() => setShowPrivacy(false)} hitSlop={12} style={styles.sheetCloseBtn}>
                <Text style={[styles.sheetCloseText, { color: `${theme.textMuted}90` }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
              <Text style={[styles.sheetEyebrow, { color: `rgba(${accentRgb}, 0.5)` }]}>
                about kataleya
              </Text>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>
                this app doesn't know who you are.
              </Text>
              <Text style={[styles.sheetSubtitle, { color: `${theme.textMuted}bb` }]}>
                and it never will. here's what that means for you.
              </Text>

              {[
                {
                  glyph: 'device' as const,
                  heading: 'everything stays on your phone',
                  body: 'your journal, your mood, your sobriety date — none of it goes anywhere. no server stores it. no company can read it. if you delete the app, it\'s gone. that\'s the point.',
                },
                {
                  glyph: 'eye-off' as const,
                  heading: 'we don\'t know you exist',
                  body: 'there is no account. no email. no username. kataleya has never seen your name or your story. you are anonymous by design.',
                },
                {
                  glyph: 'lock' as const,
                  heading: 'your sponsor sees almost nothing',
                  body: 'when you connect a sponsor, they see only what you send — a daily yes/no check-in, and which milestone you\'re at. not your mood. not your journal. not your sobriety date.',
                },
                {
                  glyph: 'flame' as const,
                  heading: 'you can disappear completely',
                  body: 'the burn ritual wipes everything — your history, your settings, your connections. nothing survives. the app returns to zero, as if you were never here.',
                },
                {
                  glyph: 'shield' as const,
                  heading: 'no ads. no tracking. ever.',
                  body: 'no advertisers. no analytics companies. no third parties watching what you do. what happens in the garden stays in the garden.',
                },
              ].map((section, si) => (
                <View key={si} style={styles.sheetSection}>
                  <View style={styles.sheetSectionHeader}>
                    <GlyphIcon
                      name={section.glyph}
                      size={16}
                      color={`rgba(${accentRgb}, 0.65)`}
                      strokeWidth={1.4}
                    />
                    <Text style={[styles.sheetSectionTitle, { color: `rgba(${accentRgb}, 0.85)` }]}>
                      {section.heading}
                    </Text>
                  </View>
                  <Text style={[styles.sheetBody, { color: `${theme.textMuted}cc` }]}>
                    {section.body}
                  </Text>
                </View>
              ))}

              <Text style={[styles.sheetFooter, { color: `${theme.textMuted}45` }]}>
                questions? privacy@kataleya.app
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
  ambientRadial: {
    position: 'absolute',
    width: '160%',
    aspectRatio: 1,
    borderRadius: 9999,
    top: '10%',
    alignSelf: 'center',
    transform: [{ scaleY: 0.6 }],
  },
  ambientGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 320,
    pointerEvents: 'none',
  },
  scroll: { paddingHorizontal: 24, alignItems: 'center', flexGrow: 1 },
  greeting: {
    fontFamily: 'SpaceMono',
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
  circadianPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  circadianPillText: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'lowercase',
  },
  heartPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heartPillGlyph: {
    fontFamily: 'SpaceMono',
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
  sheetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
    position: 'relative',
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
  },
  sheetCloseBtn: {
    position: 'absolute',
    right: 20,
  },
  sheetCloseText: {
    fontFamily: 'CourierPrime',
    fontSize: 18,
    lineHeight: 22,
  },
  sheetScroll: { paddingHorizontal: 24, paddingBottom: 40, gap: 0 },
  sheetEyebrow: {
    fontFamily: 'SpaceMono', fontSize: 9,
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
  sheetSectionTitle: {
    fontFamily: 'SpaceMono', fontSize: 10,
    letterSpacing: 2, textTransform: 'lowercase', fontWeight: '700',
  },
  sheetItemRow: { flexDirection: 'row', gap: 8, marginBottom: 5, paddingLeft: 22 },
  sheetBullet: { fontFamily: 'CourierPrime', fontSize: 12, lineHeight: 19 },
  sheetItem: { fontFamily: 'CourierPrime', fontSize: 12, lineHeight: 19, flex: 1 },
  sheetBody: { fontFamily: 'CourierPrime', fontSize: 12, lineHeight: 20, paddingLeft: 24, marginTop: 4 },
  sheetFooter: {
    fontFamily: 'SpaceMono', fontSize: 9,
    letterSpacing: 1.5, textAlign: 'center', marginTop: 16,
  },
  wordmark: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    letterSpacing: 8,
    textTransform: 'lowercase',
    marginTop: 8,
  },
  orbSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  orbComposite: {
    width: ORB_COMPOSITE,
    height: ORB_COMPOSITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ouroborosWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbInner: {
    alignItems: 'center',
    justifyContent: 'center',
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
    fontFamily: 'SpaceMono',
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  hmsCount: {
    fontFamily: 'SpaceMono',
    fontSize: 20,
    letterSpacing: 2,
    marginTop: 2,
  },
  progressSection: { width: '100%', gap: 8, marginTop: 12 },
  progressTrack: { height: 2, borderRadius: 1, width: '100%', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 1 },
  nextLabel: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    letterSpacing: 1,
    textAlign: 'center',
  },
  adjustBtn: { marginTop: 8 },
  adjustText: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'lowercase',
    textAlign: 'center',
  },
  datePickerArea: { width: '100%', gap: 10, marginTop: 4 },
  pickerCard: { borderWidth: 1, borderRadius: 12, paddingVertical: 8 },
  webDateCard: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  webDateLabel: {
    fontFamily: 'SpaceMono',
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
  // Predictive suggestion — ambient strip
  suggestionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  suggestionBody: {
    fontFamily: 'CourierPrime',
    fontSize: 12,
    letterSpacing: 0.4,
    lineHeight: 18,
  },
  suggestionActions: { alignItems: 'center', gap: 8 },
  suggestionAction: {
    fontFamily: 'SpaceMono',
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
  amPromptWrap: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    marginBottom: 4,
  },
  amPromptText: {
    fontFamily: 'CourierPrime',
    fontSize: 14,
    letterSpacing: 1,
    textAlign: 'center',
  },
  amPromptSub: {
    fontFamily: 'CourierPrime',
    fontSize: 9,
    letterSpacing: 2.5,
    textTransform: 'lowercase',
  },
  quickSlotSection: { width: '100%', gap: 12, marginTop: 8, alignItems: 'center' },
  quickSlotRow: { flexDirection: 'row', gap: 8, width: '100%' },
  quickSlot: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 3,
  },
  quickSlotGlyph: {
    fontFamily: 'CourierPrime',
    fontSize: 16,
    lineHeight: 20,
  },
  quickSlotLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'lowercase',
  },
  quickSlotSub: {
    fontFamily: 'CourierPrime',
    fontSize: 8,
    letterSpacing: 1,
  },
  amPromptWrap: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    marginBottom: 4,
  },
  amPromptText: {
    fontFamily: 'CourierPrime',
    fontSize: 14,
    letterSpacing: 1,
    textAlign: 'center',
  },
  amPromptSub: {
    fontFamily: 'CourierPrime',
    fontSize: 9,
    letterSpacing: 2.5,
    textTransform: 'lowercase',
  },
  quickSlotSection: { width: '100%', gap: 12, marginTop: 8, alignItems: 'center' },
  quickSlotRow: { flexDirection: 'row', gap: 8, width: '100%' },
  quickSlot: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 3,
  },
  quickSlotGlyph: {
    fontFamily: 'CourierPrime',
    fontSize: 16,
    lineHeight: 20,
  },
  quickSlotLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'lowercase',
  },
  quickSlotSub: {
    fontFamily: 'CourierPrime',
    fontSize: 8,
    letterSpacing: 1,
  },
  mindfulSection: { width: '100%', gap: 8, marginTop: 12 },
  mindfulRow: { flexDirection: 'row', gap: 10 },
  mindfulCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 5,
  },
  mindfulGlyph: { fontSize: 24, lineHeight: 28 },
  mindfulCardTitle: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'lowercase',
    fontWeight: '700',
  },
  mindfulCardSub: {
    fontFamily: 'SpaceMono',
    fontSize: 9,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  privacyLink: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'lowercase',
    marginTop: 4,
  },
});
