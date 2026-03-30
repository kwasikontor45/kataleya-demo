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
import { Image } from 'react-native';

const BUTTERFLY_IMG = require('@/assets/images/butterfly.jpg');
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

  const [settingDate, setSettingDate] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [showBreathing, setShowBreathing] = useState(false);
  const [showGrounding, setShowGrounding] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const [butterflyDismissed, setButterflyDismissed] = useState(false);
  const [showButterfly, setShowButterfly] = useState(false);

  // Day count pulse — gentle breath at BPM rate
  const dayPulse = useRef(new Animated.Value(1)).current;
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

  const [pickerDate, setPickerDate] = useState<Date>(
    sobriety.startDate ? new Date(sobriety.startDate) : new Date()
  );
  const panicRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevDaysSober = useRef(sobriety.daysSober);

  useEffect(() => {
    Surface.getName().then(n => setUserName(n ?? null));
  }, []);

  // Detect sustained low mood — show butterfly card
  useEffect(() => {
    const check = async () => {
      try {
        const { Sanctuary } = await import('@/utils/storage');
        const logs = await Sanctuary.getMoodLogs(10);
        if (logs.length < 4) return;
        const recent = logs.slice(0, 5);
        const avg = recent.reduce((s, l) => s + l.moodScore, 0) / recent.length;
        if (avg <= 4.5) setShowButterfly(true);
      } catch {}
    };
    check();
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
    panicRef.current = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      router.push('/cover');
    }, 1500);
  };

  const handlePanicEnd = () => {
    if (panicRef.current) clearTimeout(panicRef.current);
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

        {/* Header — logo + circadian badge */}
        <View style={styles.header}>
          <TouchableOpacity
            onPressIn={handlePanicStart}
            onPressOut={handlePanicEnd}
            activeOpacity={1}
            hitSlop={8}
          >
            <Text style={[styles.logoText, { color: `rgba(${accentRgb}, 0.9)` }]}>
              ..: kataleya :..
            </Text>
          </TouchableOpacity>
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

        {/* ── BUTTERFLY CARD — surfaces when mood has been low ── */}
        {showButterfly && !butterflyDismissed && (
          <NeonCard
            theme={theme}
            glowColor="violet"
            borderIntensity={0.2}
            fillIntensity={0.06}
            style={styles.butterflyCard}
          >
            <Image
              source={BUTTERFLY_IMG}
              style={styles.butterflyImage}
              resizeMode="cover"
            />
            <View style={styles.butterflyOverlay}>
              <Text style={[styles.butterflyQuote, { color: 'rgba(255,255,255,0.88)' }]}>
                butterflies rest when it rains{'
'}because it damages their wings.
              </Text>
              <Text style={[styles.butterflyQuoteSub, { color: 'rgba(255,255,255,0.6)' }]}>
                it's okay to rest during the storms of life.{'
'}you will fly again when it's over.
              </Text>
              <TouchableOpacity
                onPress={() => setButterflyDismissed(true)}
                style={[styles.butterflyDismiss, { borderColor: 'rgba(255,255,255,0.25)' }]}
              >
                <Text style={[styles.butterflyDismissText, { color: 'rgba(255,255,255,0.5)' }]}>
                  i know
                </Text>
              </TouchableOpacity>
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
  logoText: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    letterSpacing: 2,
    fontWeight: '700',
  },
  orbSection: {
    alignItems: 'center',
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
  butterflyCard: { width: '100%', overflow: 'hidden' },
  butterflyImage: { width: '100%', height: 180 },
  butterflyOverlay: {
    padding: 16,
    gap: 8,
    backgroundColor: 'rgba(14,12,20,0.55)',
  },
  butterflyQuote: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  butterflyQuoteSub: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
  butterflyDismiss: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  butterflyDismissText: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'lowercase',
  },
  privacyLink: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'lowercase',
    marginTop: 4,
  },
});
