'use no memo';
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCircadian } from '@/hooks/useCircadian';
import { useSobriety } from '@/hooks/useSobriety';
import { useOrchidSway } from '@/hooks/useOrchidSway';
import { useNotifications } from '@/hooks/useNotifications';
import { DataBridge } from '@/components/DataBridge';
import { OrchidProgress } from '@/components/OrchidProgress';
import { CircadianBadge } from '@/components/CircadianBadge';
import { TAB_BAR_HEIGHT } from '@/constants/circadian';
import { BLOOM_THRESHOLDS } from '@/utils/hapticBloom';

const pad = (n: number) => String(n).padStart(2, '0');

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SanctuaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, phase, phaseConfig } = useCircadian();
  const { sobriety, setStartDate } = useSobriety();
  const { x: swayX, y: swayY } = useOrchidSway();
  useNotifications(sobriety.daysSober);
  const [settingDate, setSettingDate] = useState(false);
  const [pickerDate, setPickerDate] = useState<Date>(
    sobriety.startDate ? new Date(sobriety.startDate) : new Date()
  );
  const panicRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevDaysSober = useRef(sobriety.daysSober);

  // Fire orchid bloom haptic exactly once the first time each threshold is crossed.
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

  // Derive picker variant from background luminance — avoids white-on-white
  // on iOS in dawn/morning phase when themeVariant is hardcoded to 'dark'.
  const _bgN = parseInt(theme.bg.replace('#', ''), 16);
  const _bgL = 0.299 * ((_bgN >> 16) & 255) + 0.587 * ((_bgN >> 8) & 255) + 0.114 * (_bgN & 255);
  const pickerVariant: 'dark' | 'light' = _bgL < 128 ? 'dark' : 'light';

  const handleConfirmDate = async () => {
    await setStartDate(pickerDate.toISOString());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSettingDate(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.ambientGlow, { backgroundColor: `${theme.accent}08` }]} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 12, paddingBottom: botPad + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPressIn={handlePanicStart}
            onPressOut={handlePanicEnd}
            activeOpacity={1}
            hitSlop={8}
          >
            <Text style={[styles.logoText, { color: theme.accent }]}>..: kataleya :..</Text>
          </TouchableOpacity>
          <CircadianBadge theme={theme} phaseConfig={phaseConfig} />
        </View>

        <View style={styles.orchidSection}>
          <OrchidProgress
            theme={theme}
            daysSober={sobriety.daysSober}
            progressToNext={sobriety.progressToNext}
            swayX={swayX}
            swayY={swayY}
          />
        </View>

        {sobriety.startDate ? (
          <View style={styles.timerSection}>
            <Text style={[styles.dayCount, { color: theme.accent }]}>{sobriety.daysSober}</Text>
            <Text style={[styles.dayLabel, { color: theme.textMuted }]}>days in sanctuary</Text>
            <Text style={[styles.hmsCount, { color: `${theme.text}80` }]}>
              {pad(sobriety.hoursSober)}:{pad(sobriety.minutesSober)}:{pad(sobriety.secondsSober)}
            </Text>

            {sobriety.nextMilestone && (
              <View style={styles.progressSection}>
                <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${sobriety.progressToNext * 100}%`,
                        backgroundColor: theme.accent,
                        shadowColor: theme.accent,
                        shadowRadius: 4,
                        shadowOpacity: 0.4,
                        elevation: 2,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.nextLabel, { color: theme.textMuted }]}>
                  {sobriety.nextMilestone.days - sobriety.daysSober} days to{' '}
                  <Text style={{ color: theme.accent }}>{sobriety.nextMilestone.label}</Text>
                </Text>
              </View>
            )}

            {!sobriety.nextMilestone && (
              <Text style={[styles.nextLabel, { color: theme.accent }]}>∞ all milestones achieved</Text>
            )}

            <TouchableOpacity onPress={() => setSettingDate(v => !v)} style={styles.adjustBtn}>
              <Text style={[styles.adjustText, { color: theme.textMuted }]}>
                {settingDate ? 'cancel' : 'adjust date'}
              </Text>
            </TouchableOpacity>

            {settingDate && (
              <View style={styles.datePickerArea}>
                {Platform.OS !== 'web' ? (
                  <View style={[styles.pickerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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
                  <View style={[styles.webDateCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.webDateLabel, { color: theme.textMuted }]}>Select date</Text>
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
                      style={[styles.confirmBtn, { borderColor: theme.accent, backgroundColor: `${theme.accent}18`, flex: Platform.OS === 'ios' ? 0 : 1 }]}
                      onPress={handleConfirmDate}
                    >
                      <Text style={[styles.confirmBtnText, { color: theme.accent }]}>confirm</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.setupSection}>
            <Text style={[styles.setupTitle, { color: theme.textMuted }]}>plant your seed of sobriety</Text>

            {!settingDate ? (
              <TouchableOpacity
                style={[styles.enterBtn, { borderColor: theme.accent, backgroundColor: `${theme.accent}15` }]}
                onPress={() => setSettingDate(true)}
              >
                <Text style={[styles.enterBtnText, { color: theme.accent }]}>Begin Tracking</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.datePickerArea}>
                {Platform.OS !== 'web' ? (
                  <View style={[styles.pickerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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
                  <View style={[styles.webDateCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.webDateLabel, { color: theme.textMuted }]}>Select date</Text>
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
                    style={[styles.confirmBtn, { borderColor: theme.accent, backgroundColor: `${theme.accent}18`, flex: 1 }]}
                    onPress={handleConfirmDate}
                  >
                    <Text style={[styles.confirmBtnText, { color: theme.accent }]}>confirm</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => setSettingDate(false)}>
                  <Text style={[styles.adjustText, { color: theme.textMuted }]}>cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={styles.heartSection}>
          <DataBridge phase={phase} theme={theme} size="large" />
          <Text style={[styles.phaseDesc, { color: theme.textMuted }]}>{phaseConfig.description}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  ambientGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 300,
    pointerEvents: 'none',
  },
  scroll: { paddingHorizontal: 24, alignItems: 'center', gap: 8 },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoText: { fontFamily: 'CourierPrime', fontSize: 13, letterSpacing: 2, fontWeight: '700' },
  orchidSection: { alignItems: 'center', marginVertical: 8 },
  timerSection: { alignItems: 'center', gap: 6, width: '100%' },
  dayCount: { fontFamily: 'CourierPrime', fontSize: 64, fontWeight: '700', lineHeight: 72, letterSpacing: -1 },
  dayLabel: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' },
  hmsCount: { fontFamily: 'CourierPrime', fontSize: 20, letterSpacing: 2, marginTop: 2 },
  progressSection: { width: '100%', gap: 8, marginTop: 12 },
  progressTrack: { height: 2, borderRadius: 1, width: '100%', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 1 },
  nextLabel: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 1, textAlign: 'center' },
  adjustBtn: { marginTop: 8 },
  adjustText: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 2, textTransform: 'lowercase', textAlign: 'center' },
  datePickerArea: { width: '100%', gap: 10, marginTop: 4 },
  pickerCard: { borderWidth: 1, borderRadius: 12, paddingVertical: 8 },
  webDateCard: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  webDateLabel: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  pickerFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  pickerSelected: { fontFamily: 'CourierPrime', fontSize: 12, letterSpacing: 0.5 },
  confirmBtn: { borderWidth: 1, borderRadius: 6, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  confirmBtnText: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 1.5, textTransform: 'lowercase' },
  setupSection: { alignItems: 'center', gap: 12, width: '100%' },
  setupTitle: { fontFamily: 'CourierPrime', fontSize: 13, letterSpacing: 2, textTransform: 'lowercase' },
  enterBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 13, paddingHorizontal: 28, alignItems: 'center', width: '100%' },
  enterBtnText: { fontFamily: 'CourierPrime', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' },
  heartSection: { alignItems: 'center', gap: 8, marginTop: 16, paddingBottom: 8, width: '100%' },
  phaseDesc: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 1, textAlign: 'center', lineHeight: 18, maxWidth: 280 },
});
