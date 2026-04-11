'use no memo';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Dimensions,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Platform,
  Animated,
  Easing,
  Modal,
  AccessibilityInfo,
} from 'react-native';
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
import { GlyphIcon } from '@/components/GlyphIcon';
import { BreathingExercise } from '@/components/BreathingExercise';
import { GroundingExercise } from '@/components/GroundingExercise';
import { TAB_BAR_HEIGHT } from '@/constants/circadian';
import { BLOOM_THRESHOLDS } from '@/utils/hapticBloom';
import { Surface, Sanctuary } from '@/utils/storage';
import { useUserState } from '@/hooks/use-user-state';
import { ScanlineLayer } from '@/components/scanline-layer';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
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

// Human-readable duration — nil under 30 days (raw count is the meaning)
function humanDuration(days: number): string | null {
  if (days < 30) return null;
  const years  = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const rem    = days % 30;
  const parts: string[] = [];
  if (years  > 0) parts.push(`${years} yr`);
  if (months > 0) parts.push(`${months} mo`);
  if (rem    > 0 || parts.length === 0) parts.push(`${rem} day${rem !== 1 ? 's' : ''}`);
  return parts.join(' · ');
}

// ── Mercury line — the line itself is the mercury, rolling on glass ──────────
const MERCURY_W  = SCREEN_W - 48;
const MERCURY_LEN = 56; // length of the mercury slug

function MercuryLine({ accentRgb }: { accentRgb: string }) {
  const pos = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pos, {
          toValue: 1, duration: 5200,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(pos, {
          toValue: 0, duration: 5200,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();
    return () => pos.stopAnimation();
  }, []);

  const tx = pos.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, MERCURY_W - MERCURY_LEN],
  });

  return (
    <View style={styles.mercuryWrap}>
      {/* Channel — barely there */}
      <View style={[styles.mercuryChannel, { backgroundColor: `rgba(138,138,158,0.08)` }]} />
      {/* The mercury — a 1px line rolling */}
      <Animated.View style={[styles.mercurySlug, {
        backgroundColor: `rgba(${accentRgb}, 0.6)`,
        shadowColor: `rgb(${accentRgb})`,
        transform: [{ translateX: tx }],
      }]} />
    </View>
  );
}

// Circadian accent RGB — matches GhostPulseOrb color logic
function phaseAccentRgb(phase: string): string {
  if (phase === 'goldenHour') return NEON_RGB.amber;
  if (phase === 'night')      return NEON_RGB.violet;
  if (phase === 'dawn')       return NEON_RGB.cyan;
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


// ── Custom date picker — three scroll columns, phase-themed ──────────────────
const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const ITEM_H = 40;

function DateScrollPicker({
  value, onChange, accentRgb, phaseRgb, textMuted, bg,
}: {
  value: Date;
  onChange: (d: Date) => void;
  accentRgb: string;
  phaseRgb: string;
  textMuted: string;
  bg: string;
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const years = Array.from({ length: currentYear - 1989 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i);
  const getDays = (m: number, y: number) => new Date(y, m + 1, 0).getDate();
  const days = Array.from({ length: getDays(value.getMonth(), value.getFullYear()) }, (_, i) => i + 1);

  const monthRef = useRef<any>(null);
  const dayRef   = useRef<any>(null);
  const yearRef  = useRef<any>(null);

  const scrollTo = (ref: React.RefObject<any>, idx: number) => {
    ref.current?.scrollToIndex({ index: Math.max(0, idx), animated: true, viewPosition: 0.5 });
  };

  const setMonth = (m: number) => {
    const d = new Date(value);
    d.setMonth(m);
    if (d > now) d.setTime(now.getTime());
    onChange(d);
  };
  const setDay = (day: number) => {
    const d = new Date(value);
    d.setDate(day);
    if (d > now) d.setTime(now.getTime());
    onChange(d);
  };
  const setYear = (y: number) => {
    const d = new Date(value);
    d.setFullYear(y);
    if (d > now) d.setTime(now.getTime());
    onChange(d);
  };

  const renderItem = (
    label: string, isSelected: boolean, onSelect: () => void
  ) => (
    <TouchableOpacity
      onPress={onSelect}
      style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}
      activeOpacity={0.7}
    >
      <Text style={{
        fontFamily: 'CourierPrime',
        fontSize: isSelected ? 18 : 13,
        color: isSelected ? `rgba(${accentRgb},0.9)` : `rgba(${accentRgb},0.28)`,
        letterSpacing: 1,
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{
      flexDirection: 'row',
      height: ITEM_H * 3,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: `rgba(${accentRgb},0.15)`,
      borderRadius: 10,
      backgroundColor: `rgba(${accentRgb},0.04)`,
      overflow: 'hidden',
      paddingHorizontal: 8,
    }}>
      {/* Selection highlight */}
      <View style={{
        position: 'absolute',
        left: 8, right: 8,
        height: ITEM_H,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: `rgba(${phaseRgb},0.18)`,
        backgroundColor: `rgba(${phaseRgb},0.06)`,
      }} pointerEvents="none" />

      {/* Month */}
      <FlatList
        ref={monthRef}
        data={months}
        keyExtractor={i => String(i)}
        style={{ width: 52, height: ITEM_H * 3 }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_H }}
        getItemLayout={(_, i) => ({ length: ITEM_H, offset: ITEM_H * i, index: i })}
        onLayout={() => scrollTo(monthRef, value.getMonth())}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
          if (months[idx] !== undefined) setMonth(months[idx]);
        }}
        renderItem={({ item }) => renderItem(
          MONTHS[item], item === value.getMonth(),
          () => { setMonth(item); scrollTo(monthRef, item); }
        )}
      />

      {/* Day */}
      <FlatList
        ref={dayRef}
        data={days}
        keyExtractor={i => String(i)}
        style={{ width: 40, height: ITEM_H * 3 }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_H }}
        getItemLayout={(_, i) => ({ length: ITEM_H, offset: ITEM_H * i, index: i })}
        onLayout={() => scrollTo(dayRef, value.getDate() - 1)}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
          if (days[idx] !== undefined) setDay(days[idx]);
        }}
        renderItem={({ item }) => renderItem(
          String(item).padStart(2, '0'), item === value.getDate(),
          () => { setDay(item); scrollTo(dayRef, item - 1); }
        )}
      />

      {/* Year */}
      <FlatList
        ref={yearRef}
        data={years}
        keyExtractor={i => String(i)}
        style={{ width: 58, height: ITEM_H * 3 }}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_H }}
        getItemLayout={(_, i) => ({ length: ITEM_H, offset: ITEM_H * i, index: i })}
        onLayout={() => scrollTo(yearRef, years.indexOf(value.getFullYear()))}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
          if (years[idx] !== undefined) setYear(years[idx]);
        }}
        renderItem={({ item }) => renderItem(
          String(item), item === value.getFullYear(),
          () => { setYear(item); scrollTo(yearRef, years.indexOf(item)); }
        )}
      />
    </View>
  );
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
  const [reduceMotion, setReduceMotion] = useState(false);
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
  // Scroll parallax
  const scrollY       = useRef(new Animated.Value(0)).current;
  const bgParallaxY   = scrollY.interpolate({ inputRange: [0, 400], outputRange: [0, 20],  extrapolate: 'clamp' });
  // Quick-slot press depth
  const slotScale0 = useRef(new Animated.Value(1)).current;
  const slotScale1 = useRef(new Animated.Value(1)).current;
  const slotScale2 = useRef(new Animated.Value(1)).current;
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

  // ECG sweep — occasional heartbeat through letters. Skipped on reduce motion.
  useEffect(() => {
    if (reduceMotion) return;
    const sweep = () => {
      ecgAnim.setValue(-1);
      Animated.timing(ecgAnim, {
        toValue: 8,
        duration: 600,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) setTimeout(sweep, 2400); // long rest — heartbeat not loop
      });
    };
    const t = setTimeout(sweep, 1800);
    return () => clearTimeout(t);
  }, [ecgAnim, reduceMotion]);

  // Heart pill idle animation — slow breath. Skipped on reduce motion.
  useEffect(() => {
    if (reduceMotion) return;
    const idlePulse = () => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pillPulse, {
            toValue: 1.025,
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pillGlow, {
            toValue: 0.52,
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
  }, [pillPulse, pillGlow, reduceMotion]);

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
  const prevDaysSober = useRef(sobriety.daysSober);

  useEffect(() => {
    Surface.getName().then(n => setUserName(n ?? null));
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
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

  const handleOverrideToggle = () => {
    setDarkOverride(!darkOverride);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOverrideHint(true);
    if (overrideHintTimer.current) clearTimeout(overrideHintTimer.current);
    overrideHintTimer.current = setTimeout(() => setOverrideHint(false), 2500);
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + TAB_BAR_HEIGHT : insets.bottom + TAB_BAR_HEIGHT;

  const handleConfirmDate = async () => {
    await setStartDate(pickerDate.toISOString());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSettingDate(false);
  };

  const accentRgb = darkOverride ? '138,95,224' : (theme.phaseRgb ?? phaseAccentRgb(phase));

  const hour = new Date().getHours();
  const is2am = phase === 'night' && hour >= 0 && hour < 5;
  const isStruggling = userState === 'struggling' || userState === 'rest';

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScanlineLayer />

      {/* Atmosphere — single deep bloom centered on the orb, no zone bands */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.atmosBloom,
          {
            backgroundColor: ambientGlow.interpolate({
              inputRange:  [0, 1],
              outputRange: [`rgba(${accentRgb}, 0.0)`, `rgba(${accentRgb}, 0.06)`],
            }),
            transform: [{ translateY: bgParallaxY }],
          },
        ]}
      />

      {/* Vignette — radial dark at edges, pulls focus to center */}
      <Svg
        style={StyleSheet.absoluteFill}
        width={SCREEN_W}
        height={SCREEN_H}
        pointerEvents="none"
      >
        <Defs>
          <RadialGradient
            id="vig"
            cx="50%"
            cy="46%"
            rx="56%"
            ry="62%"
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2={SCREEN_W}
            y2={SCREEN_H}
          >
            <Stop offset="0%" stopColor="#050508" stopOpacity={0} />
            <Stop offset="68%" stopColor="#050508" stopOpacity={0.28} />
            <Stop offset="100%" stopColor="#050508" stopOpacity={0.68} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={SCREEN_W} height={SCREEN_H} fill="url(#vig)" />
      </Svg>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 12, paddingBottom: botPad + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Greeting */}
        {userName ? (
          <Text style={[styles.greeting, { color: `rgba(${accentRgb}, 0.65)` }]}>
            {greetPhrase(phase)}, {userName.toLowerCase()}
          </Text>
        ) : null}

        {/* ── HEADER — three pills, full-width, space-between ── */}
        <View style={styles.header}>

          {/* Left pill — "kataleya" ECG sweep — long-press = override toggle */}
          <TouchableOpacity
            onLongPress={handleOverrideToggle}
            delayLongPress={600}
            activeOpacity={0.75}
            hitSlop={8}
            style={styles.logoContainer}
          >
            <Animated.View style={[
              styles.heartPill,
              {
                borderColor: pillGlow.interpolate({
                  inputRange: [0.4, 1.0],
                  outputRange: [`rgba(${accentRgb}, 0.32)`, `rgba(${accentRgb}, 0.7)`],
                }),
                shadowColor: `rgb(${accentRgb})`,
                transform: [{ scale: pillPulse }],
              },
            ]}>
              {/* ECG sweep overlay — a moving highlight passes through the text */}
              <View style={styles.pillInner}>
                {'kataleya'.split('').map((char, i) => (
                  <Animated.Text
                    key={i}
                    style={[
                      styles.heartPillGlyph,
                      {
                        color: `rgba(${accentRgb}, 0.88)`,
                        marginRight: i < 7 ? 3 : 0,
                        letterSpacing: 0,
                        opacity: ecgAnim.interpolate({
                          inputRange: [i - 1.5, i - 0.3, i, i + 0.3, i + 1.5],
                          outputRange: [0.2, 0.6, 1.0, 0.6, 0.2],
                          extrapolate: 'clamp',
                        }),
                      },
                    ]}
                  >
                    {char}
                  </Animated.Text>
                ))}
                {darkOverride && (
                  <Text style={[styles.heartPillGlyph, { color: `rgba(${accentRgb}, 0.45)`, marginLeft: 5, letterSpacing: 0 }]}>
                    ◗
                  </Text>
                )}
              </View>
            </Animated.View>
          </TouchableOpacity>

          {/* Right pill — phase display, read-only */}
          {overrideHint && (
            <View style={{ position: 'absolute', top: 36, alignSelf: 'center', zIndex: 10 }}>
              <Text style={{ fontFamily: 'SpaceMono', fontSize: 9, letterSpacing: 1.5, color: `rgba(${accentRgb},0.6)` }}>
                {darkOverride ? 'overriding circadian clock' : 'following circadian rhythm'}
              </Text>
            </View>
          )}
          <View style={[styles.circadianPill, {
            borderColor: darkOverride ? `rgba(${accentRgb}, 0.2)` : `rgba(${accentRgb}, 0.35)`,
          }]}>
            <Text style={[styles.circadianPillText, {
              color: darkOverride ? `rgba(${accentRgb}, 0.35)` : theme.accent,
            }]}>
              {darkOverride ? `${phaseConfig.displayName} ◗` : phaseConfig.displayName}
            </Text>
          </View>

        </View>

        {/* ── GHOST PULSE ORB + OUROBOROS RING — snake encircles butterfly ── */}
        <View style={styles.orbSection}>
          <TouchableOpacity
            activeOpacity={is2am ? 0.7 : 1}
            onPress={is2am ? () => router.push('/cover') : undefined}
            style={styles.orbComposite}
          >
            {/* OuroborosRing — tilted into perspective, halo not flat circle */}
            <View style={[styles.ouroborosWrap, {
              transform: [{ perspective: 700 }, { rotateX: '-10deg' }],
            }]} pointerEvents="none">
              <OuroborosRing
                size={Math.floor(ORB_COMPOSITE * 0.94)}
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

        {/* Timer */}
        {sobriety.startDate ? (
          <View style={styles.timerSection}>
            <Animated.Text style={[styles.dayCount, { color: `rgba(${accentRgb}, 0.95)`, transform: [{ scale: dayPulse }] }]}>
              {sobriety.daysSober}
            </Animated.Text>
            <Text style={[styles.dayLabel, { color: `rgba(${accentRgb}, 0.45)` }]}>
              {sobriety.daysSober === 1 ? 'day in sanctuary' : 'days in sanctuary'}
            </Text>
            {humanDuration(sobriety.daysSober) && (
              <Text style={[styles.humanDuration, { color: `rgba(${accentRgb}, 0.35)` }]}>
                {humanDuration(sobriety.daysSober)}
              </Text>
            )}
            <MercuryLine accentRgb={accentRgb} />

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
                  {`${sobriety.nextMilestone.days - sobriety.daysSober} ${sobriety.nextMilestone.days - sobriety.daysSober === 1 ? 'day' : 'days'} to`}{' '}
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

            <TouchableOpacity onPress={() => setSettingDate(true)} style={styles.adjustBtn}>
              <Text style={[styles.adjustText, { color: `${theme.textMuted}70` }]}>
                adjust date
              </Text>
            </TouchableOpacity>
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
              onPress={() => router.push('/cover')}
              onPressIn={() => Animated.spring(slotScale0, { toValue: 0.93, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(slotScale0, { toValue: 1.0,  useNativeDriver: true }).start()}
              activeOpacity={0.85}
              style={{ flex: 1 }}
            >
              <Animated.View style={[styles.quickSlot, {
                borderColor: `rgba(${NEON_RGB.amber},0.2)`,
                borderTopColor: `rgba(${NEON_RGB.amber},0.5)`,
                backgroundColor: `rgba(${NEON_RGB.amber},0.04)`,
                shadowColor: `rgb(${NEON_RGB.amber})`,
                transform: [{ scale: slotScale0 }],
              }]}>
                <Text style={[styles.quickSlotGlyph, { color: `rgba(${NEON_RGB.amber},0.45)` }]}>◬</Text>
                <Text style={[styles.quickSlotLabel, { color: `rgba(${NEON_RGB.amber},0.55)` }]}>sanctuary</Text>
                <Text style={[styles.quickSlotSub, { color: `rgba(${NEON_RGB.amber},0.25)` }]}>2am</Text>
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowBreathing(true)}
              onPressIn={() => Animated.spring(slotScale1, { toValue: 0.93, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(slotScale1, { toValue: 1.0,  useNativeDriver: true }).start()}
              activeOpacity={0.85}
              style={{ flex: 1 }}
            >
              <Animated.View style={[styles.quickSlot, {
                borderColor: `rgba(${NEON_RGB.cyan},0.2)`,
                borderTopColor: `rgba(${NEON_RGB.cyan},0.5)`,
                backgroundColor: `rgba(${NEON_RGB.cyan},0.04)`,
                shadowColor: `rgb(${NEON_RGB.cyan})`,
                transform: [{ scale: slotScale1 }],
              }]}>
                <Text style={[styles.quickSlotGlyph, { color: `rgba(${NEON_RGB.cyan},0.45)` }]}>◎</Text>
                <Text style={[styles.quickSlotLabel, { color: `rgba(${NEON_RGB.cyan},0.55)` }]}>breathe</Text>
                <Text style={[styles.quickSlotSub, { color: `rgba(${NEON_RGB.cyan},0.25)` }]}>4·7·8</Text>
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowGrounding(true)}
              onPressIn={() => Animated.spring(slotScale2, { toValue: 0.93, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(slotScale2, { toValue: 1.0,  useNativeDriver: true }).start()}
              activeOpacity={0.85}
              style={{ flex: 1 }}
            >
              <Animated.View style={[styles.quickSlot, {
                borderColor: `rgba(${NEON_RGB.violet},0.2)`,
                borderTopColor: `rgba(${NEON_RGB.violet},0.5)`,
                backgroundColor: `rgba(${NEON_RGB.violet},0.04)`,
                shadowColor: `rgb(${NEON_RGB.violet})`,
                transform: [{ scale: slotScale2 }],
              }]}>
                <Text style={[styles.quickSlotGlyph, { color: `rgba(${NEON_RGB.violet},0.45)` }]}>⟡</Text>
                <Text style={[styles.quickSlotLabel, { color: `rgba(${NEON_RGB.violet},0.55)` }]}>ground</Text>
                <Text style={[styles.quickSlotSub, { color: `rgba(${NEON_RGB.violet},0.25)` }]}>5·4·3·2·1</Text>
              </Animated.View>
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

      {/* ── DATE PICKER MODAL — slides up from bottom ── */}
      <Modal
        visible={settingDate}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setSettingDate(false)}
      >
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={styles.privacyBackdrop}
            activeOpacity={1}
            onPress={() => setSettingDate(false)}
          />
          <View style={[styles.datePickerSheet, { backgroundColor: theme.bg, borderColor: `rgba(${accentRgb}, 0.2)` }]}>
            <View style={styles.sheetTopRow}>
              <View style={[styles.sheetHandle, { backgroundColor: `rgba(${accentRgb}, 0.3)` }]} />
              <TouchableOpacity onPress={() => setSettingDate(false)} hitSlop={12} style={styles.sheetCloseBtn}>
                <Text style={[styles.sheetCloseText, { color: `${theme.textMuted}90` }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.datePickerTitle, { color: `rgba(${accentRgb}, 0.55)` }]}>
              set your date
            </Text>
            <View style={{ paddingHorizontal: 24, paddingBottom: 32, gap: 16 }}>
              {Platform.OS !== 'web' ? (
                <DateScrollPicker
                  value={pickerDate}
                  onChange={setPickerDate}
                  accentRgb={accentRgb}
                  phaseRgb={theme.phaseRgb ?? accentRgb}
                  textMuted={theme.textMuted}
                  bg={theme.bg}
                />
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
              <Text style={[styles.pickerSelected, { color: theme.textMuted, textAlign: 'center' }]}>
                {formatDate(pickerDate)}
              </Text>
              <TouchableOpacity
                style={[styles.confirmBtn, { borderColor: `rgba(${accentRgb}, 0.4)`, backgroundColor: `rgba(${accentRgb}, 0.1)` }]}
                onPress={handleConfirmDate}
              >
                <Text style={[styles.confirmBtnText, { color: `rgba(${accentRgb}, 0.9)` }]}>confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  atmosBloom: {
    position: 'absolute',
    width: SCREEN_W * 2.0,
    height: SCREEN_W * 2.0,
    borderRadius: SCREEN_W,
    top: SCREEN_H * 0.08,
    left: -SCREEN_W * 0.5,
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
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
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
  // Privacy modal
  datePickerSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 12,
  },
  datePickerTitle: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'lowercase',
    textAlign: 'center',
    marginBottom: 16,
  },
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
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  orbComposite: {
    width: ORB_COMPOSITE,
    height: ORB_COMPOSITE,
    overflow: 'hidden',
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
  humanDuration: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  mercuryWrap: {
    width: MERCURY_W,
    height: 16,
    justifyContent: 'center',
    marginTop: 4,
  },
  mercuryChannel: {
    height: 1,
    width: '100%',
    borderRadius: 1,
  },
  mercurySlug: {
    position: 'absolute',
    width: MERCURY_LEN,
    height: 1,
    borderRadius: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 2,
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
    borderTopWidth: 1.5,   // top-edge catches light — EVE Online surface depth
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
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
