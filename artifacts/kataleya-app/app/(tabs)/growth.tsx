import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, TextInput, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCircadian } from '@/hooks/useCircadian';
import { useSobriety } from '@/hooks/useSobriety';
import { useInsights } from '@/hooks/useInsights';
import { TAB_BAR_HEIGHT } from '@/constants/circadian';
import { NeonCard, NEON_RGB } from '@/components/NeonCard';
import { GlyphIcon, milestoneGlyph } from '@/components/GlyphIcon';
import { ScanlineLayer } from '@/components/scanline-layer';
import { Surface, WeeklyReview, getISOWeekKey } from '@/utils/storage';

// Confidence → glow intensity for insight cards
function confidenceToIntensity(confidence: number): number {
  return 0.04 + confidence * 0.1;
}

// ── Weekly review areas — from the recovery workbook ─────────────────────────
const REVIEW_AREAS: { key: keyof WeeklyReview['scores']; label: string }[] = [
  { key: 'sobriety',   label: 'sobriety' },
  { key: 'mood',       label: 'mood & emotional health' },
  { key: 'sleep',      label: 'sleep quality' },
  { key: 'physical',   label: 'physical health & movement' },
  { key: 'connection', label: 'connection with others' },
  { key: 'treatment',  label: 'treatment block consistency' },
  { key: 'schedule',   label: 'following daily structure' },
];

function emptyScores(): WeeklyReview['scores'] {
  return { sobriety: null, mood: null, sleep: null, physical: null, connection: null, treatment: null, schedule: null };
}

export default function GrowthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, phase } = useCircadian();
  const { sobriety } = useSobriety();
  const { insights, loading: insightsLoading, dataAgeDays, hasEnoughData } = useInsights();
  const accentRgb = theme.phaseRgb;

  // ── Weekly review state ───────────────────────────────────────────────────
  const thisWeek = getISOWeekKey(0);
  const [review, setReview] = useState<WeeklyReview>({
    weekKey: thisWeek, ts: Date.now(), scores: emptyScores(), win: '', adjustment: '',
  });
  const [lastReview, setLastReview] = useState<WeeklyReview | null>(null);
  const [reviewSaved, setReviewSaved] = useState(false);
  const [winFocused, setWinFocused] = useState(false);
  const [adjFocused, setAdjFocused] = useState(false);

  // Sunday in void phase = review time
  const now = new Date();
  const isSunday = now.getDay() === 0;
  const isVoid = phase === 'night';
  const isReviewTime = isSunday && isVoid;

  const loadReview = useCallback(async () => {
    const [current, last] = await Promise.all([
      Surface.getWeeklyReview(thisWeek),
      Surface.getLastWeeklyReview(),
    ]);
    if (current) { setReview(current); setReviewSaved(true); }
    setLastReview(last);
  }, [thisWeek]);

  useEffect(() => { loadReview(); }, [loadReview]);

  const handleScoreSet = (key: keyof WeeklyReview['scores'], score: number) => {
    setReview(r => ({ ...r, scores: { ...r.scores, [key]: r.scores[key] === score ? null : score } }));
    setReviewSaved(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveReview = async () => {
    Keyboard.dismiss();
    const toSave: WeeklyReview = { ...review, weekKey: thisWeek, ts: Date.now() };
    await Surface.saveWeeklyReview(toSave);
    setReviewSaved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const filledScores = Object.values(review.scores).filter(v => v !== null).length;
  const avgScore = filledScores > 0
    ? Object.values(review.scores).filter((v): v is number => v !== null).reduce((a, b) => a + b, 0) / filledScores
    : null;
  const lastAvg = lastReview
    ? Object.values(lastReview.scores).filter((v): v is number => v !== null).reduce((a, b) => a + b, 0) /
      Math.max(1, Object.values(lastReview.scores).filter(v => v !== null).length)
    : null;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + TAB_BAR_HEIGHT : insets.bottom + TAB_BAR_HEIGHT;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScanlineLayer />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 16 }]} showsVerticalScrollIndicator={false}>

        <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)` }]}>season of growth</Text>

        {/* Milestone dot timeline */}
        <NeonCard theme={theme} accentRgb={accentRgb} fillIntensity={0.04} borderIntensity={0.14} style={styles.timelineCard}>
          <View style={styles.timelineInner}>
            {sobriety.milestones.map((m, i) => {
              const isActive = m.achieved && (i === sobriety.milestones.length - 1 || !sobriety.milestones[i + 1].achieved);
              const isLast = i === sobriety.milestones.length - 1;
              return (
                <View key={m.days} style={styles.milestoneItem}>
                  <View style={styles.milestoneLeft}>
                    {/* Connecting line */}
                    {!isLast && (
                      <View style={[styles.milestoneLine, {
                        backgroundColor: m.achieved && sobriety.milestones[i + 1]?.achieved
                          ? `rgba(${accentRgb},0.4)`
                          : `rgba(${accentRgb},0.08)`,
                      }]} />
                    )}
                    {/* Dot */}
                    <View style={[
                      styles.milestoneDot,
                      {
                        width: isActive ? 12 : 8,
                        height: isActive ? 12 : 8,
                        borderRadius: isActive ? 6 : 4,
                        backgroundColor: m.achieved ? `rgba(${accentRgb},0.9)` : `rgba(${accentRgb},0.12)`,
                        borderWidth: isActive ? 2 : 0,
                        borderColor: `rgba(${accentRgb},0.5)`,
                      },
                    ]} />
                  </View>
                  <View style={[styles.milestoneContent, { opacity: m.achieved ? 1 : 0.3 }]}>
                    <View style={styles.milestoneLabelRow}>
                      <GlyphIcon
                        name={milestoneGlyph(m.days)}
                        size={14}
                        color={m.achieved ? `rgba(${accentRgb},${isActive ? '0.95' : '0.6'})` : `rgba(${accentRgb},0.15)`}
                        strokeWidth={1.4}
                      />
                      <Text style={[styles.milestoneLabel, { color: isActive ? `rgba(${accentRgb},0.95)` : theme.text }]}>
                        {m.label}
                      </Text>
                    </View>
                    <Text style={[styles.milestoneDays, { color: `${theme.textMuted}70` }]}>
                      {m.days} {m.days === 1 ? 'day' : 'days'}
                    </Text>
                  </View>
                </View>
              );
            })}

            {/* Next bloom — inlined as timeline footer */}
            {sobriety.nextMilestone && (
              <View style={[styles.nextBloomInline, { borderTopColor: `rgba(${accentRgb},0.1)` }]}>
                <View style={styles.nextBloomRow}>
                  <Text style={[styles.nextBloomCount, { color: `rgba(${accentRgb},0.9)` }]}>
                    {sobriety.nextMilestone.days - sobriety.daysSober}
                  </Text>
                  <Text style={[styles.nextBloomLabel, { color: `rgba(${accentRgb},0.45)` }]}>
                    days to {sobriety.nextMilestone.label}
                  </Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: `rgba(${accentRgb},0.1)` }]}>
                  <View style={[styles.progressFill, { width: `${sobriety.progressToNext * 100}%`, backgroundColor: `rgba(${accentRgb},0.6)` }]} />
                </View>
              </View>
            )}
          </View>
        </NeonCard>

        {/* No date set */}
        {!sobriety.startDate && (
          <NeonCard theme={theme} accentRgb={accentRgb} style={styles.emptyCard}>
            <View style={styles.emptyBlock}>
              <GlyphIcon name="sprout" size={28} color={`rgba(${accentRgb},0.25)`} strokeWidth={1.2} />
              <Text style={[styles.emptyText, { color: `${theme.textMuted}70` }]}>
                the season hasn't begun yet.{'\n'}plant your date in the sanctuary and growth appears here.
              </Text>
            </View>
          </NeonCard>
        )}

        {/* Insights */}
        {!insightsLoading && (
          <>
            <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)`, marginTop: 24 }]}>patterns</Text>

            {!hasEnoughData ? (
              <NeonCard theme={theme} accentRgb={accentRgb} fillIntensity={0.03} borderIntensity={0.1}>
                <View style={styles.emptyBlock}>
                  <GlyphIcon name="rain" size={28} color={`rgba(${accentRgb},0.2)`} strokeWidth={1.2} />
                  <Text style={[styles.insightEmpty, { color: `${theme.textMuted}70` }]}>
                    patterns form in silence.{'\n'}log your mood for a few days and they'll surface here — no server, no model, just your data.
                  </Text>
                </View>
              </NeonCard>
            ) : insights.length === 0 ? (
              <NeonCard theme={theme} accentRgb={accentRgb} fillIntensity={0.03} borderIntensity={0.1}>
                <Text style={[styles.insightEmpty, { color: `${theme.textMuted}70` }]}>
                  no patterns strong enough to surface yet. keep logging.
                </Text>
              </NeonCard>
            ) : (
              <>
                {insights.map(ins => (
                  <NeonCard
                    key={ins.id}
                    theme={theme}
                    accentRgb={accentRgb}
                    fillIntensity={confidenceToIntensity(ins.confidence)}
                    borderIntensity={0.1 + ins.confidence * 0.15}
                    style={styles.insightCard}
                  >
                    <View style={styles.insightInner}>
                      <Text style={[styles.insightText, { color: `${theme.text}ee` }]}>{ins.message}</Text>
                      <Text style={[styles.insightMeta, { color: `rgba(${accentRgb},0.45)` }]}>
                        {ins.n} observations · {Math.round(ins.confidence * 100)}% confidence
                      </Text>
                    </View>
                  </NeonCard>
                ))}
                {dataAgeDays > 30 && (
                  <Text style={[styles.ageNote, { color: `${theme.textMuted}60` }]}>
                    based on your logs from {dataAgeDays} days ago. log today to refresh.
                  </Text>
                )}
              </>
            )}
          </>
        )}

        {/* ── Weekly review ── */}
        <Text style={[
          styles.sectionLabel,
          {
            color: isReviewTime
              ? `rgba(${NEON_RGB.violet},0.75)`
              : `rgba(${accentRgb},0.5)`,
            marginTop: 24,
          },
        ]}>
          {isReviewTime ? '· weekly review ·' : 'weekly review'}
        </Text>

        {/* Last week summary badge */}
        {lastAvg !== null && (
          <NeonCard theme={theme} accentRgb={accentRgb} fillIntensity={0.02} borderIntensity={0.08}>
            <View style={styles.lastWeekRow}>
              <Text style={[styles.lastWeekLabel, { color: `${theme.textMuted}70` }]}>
                last week
              </Text>
              <Text style={[styles.lastWeekScore, { color: `rgba(${accentRgb},0.75)` }]}>
                {lastAvg.toFixed(1)} / 10
              </Text>
              {lastReview?.win ? (
                <Text style={[styles.lastWeekWin, { color: `${theme.textMuted}60` }]} numberOfLines={1}>
                  "{lastReview.win}"
                </Text>
              ) : null}
            </View>
          </NeonCard>
        )}

        <NeonCard
          theme={theme}
          accentRgb={isReviewTime ? NEON_RGB.violet : accentRgb}
          fillIntensity={isReviewTime ? 0.05 : 0.03}
          borderIntensity={isReviewTime ? 0.22 : 0.12}
        >
          <View style={styles.reviewInner}>

            {/* Seven areas — 1–10 pill per row */}
            {REVIEW_AREAS.map(area => {
              const score = review.scores[area.key];
              return (
                <View key={area.key} style={styles.reviewAreaRow}>
                  <Text style={[styles.reviewAreaLabel, { color: `${theme.textMuted}cc` }]}>
                    {area.label}
                  </Text>
                  <View style={styles.reviewPills}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => {
                      const sel = score === n;
                      const heat = n <= 4 ? '255,107,107' : n <= 7 ? NEON_RGB.amber : NEON_RGB.cyan;
                      return (
                        <TouchableOpacity
                          key={n}
                          style={[styles.reviewPill, {
                            borderColor: `rgba(${heat},${sel ? 0.8 : 0.15})`,
                            backgroundColor: sel ? `rgba(${heat},0.18)` : `rgba(${heat},0.03)`,
                          }]}
                          onPress={() => handleScoreSet(area.key, n)}
                        >
                          <Text style={[styles.reviewPillNum, { color: `rgba(${heat},${sel ? 1 : 0.4})` }]}>
                            {n}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}

            {/* Average — appears once at least one score is set */}
            {avgScore !== null && (
              <View style={[styles.avgRow, { borderTopColor: `rgba(${accentRgb},0.1)` }]}>
                <Text style={[styles.avgLabel, { color: `${theme.textMuted}70` }]}>this week</Text>
                <Text style={[styles.avgScore, { color: `rgba(${accentRgb},0.9)` }]}>
                  {avgScore.toFixed(1)} / 10
                </Text>
              </View>
            )}

            {/* Biggest win */}
            <Text style={[styles.reviewQuestion, { color: `${theme.textMuted}cc`, marginTop: 16 }]}>
              biggest win this week
            </Text>
            <TextInput
              value={review.win}
              onChangeText={v => { setReview(r => ({ ...r, win: v })); setReviewSaved(false); }}
              onFocus={() => setWinFocused(true)}
              onBlur={() => setWinFocused(false)}
              placeholder="something you're proud of, even something small..."
              placeholderTextColor={`rgba(${accentRgb},0.2)`}
              multiline
              maxLength={280}
              style={[styles.reviewInput, {
                color: theme.text,
                borderColor: `rgba(${accentRgb},${winFocused ? 0.35 : 0.1})`,
                backgroundColor: `rgba(${accentRgb},0.03)`,
              }]}
            />

            {/* One adjustment */}
            <Text style={[styles.reviewQuestion, { color: `${theme.textMuted}cc`, marginTop: 12 }]}>
              one thing to adjust next week
            </Text>
            <TextInput
              value={review.adjustment}
              onChangeText={v => { setReview(r => ({ ...r, adjustment: v })); setReviewSaved(false); }}
              onFocus={() => setAdjFocused(true)}
              onBlur={() => setAdjFocused(false)}
              placeholder="one small shift..."
              placeholderTextColor={`rgba(${accentRgb},0.2)`}
              multiline
              maxLength={280}
              style={[styles.reviewInput, {
                color: theme.text,
                borderColor: `rgba(${accentRgb},${adjFocused ? 0.35 : 0.1})`,
                backgroundColor: `rgba(${accentRgb},0.03)`,
              }]}
            />

            {/* Save */}
            <TouchableOpacity
              style={[styles.reviewSaveBtn, {
                borderColor: reviewSaved
                  ? `rgba(${NEON_RGB.cyan},0.4)`
                  : `rgba(${accentRgb},0.35)`,
                backgroundColor: reviewSaved
                  ? `rgba(${NEON_RGB.cyan},0.08)`
                  : `rgba(${accentRgb},0.07)`,
                opacity: filledScores === 0 ? 0.4 : 1,
              }]}
              onPress={handleSaveReview}
              disabled={filledScores === 0}
            >
              <Text style={[styles.reviewSaveTxt, {
                color: reviewSaved
                  ? `rgba(${NEON_RGB.cyan},0.9)`
                  : `rgba(${accentRgb},0.85)`,
              }]}>
                {reviewSaved ? '✓ saved' : 'seal this week'}
              </Text>
            </TouchableOpacity>

          </View>
        </NeonCard>

        <View style={[styles.privacyNote, { borderColor: `rgba(${accentRgb},0.1)` }]}>
          <Text style={[styles.privacyText, { color: `${theme.textMuted}45` }]}>
            all growth data lives only on this device
          </Text>
          <TouchableOpacity onPress={() => router.push('/privacy')} hitSlop={8}>
            <Text style={[styles.privacyLink, { color: `rgba(${accentRgb},0.35)` }]}>privacy →</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 20 },
  sectionLabel: { fontFamily: 'SpaceMono', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 },
  timelineCard: { width: '100%' },
  timelineInner: { padding: 16, gap: 0 },
  milestoneItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, minHeight: 44 },
  milestoneLeft: { alignItems: 'center', width: 12, paddingTop: 4 },
  milestoneLine: { position: 'absolute', top: 16, width: 1, height: 36 },
  milestoneDot: { flexShrink: 0 },
  milestoneContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12 },
  milestoneLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  milestoneLabel: { fontFamily: 'CourierPrime', fontSize: 13 },
  milestoneDays: { fontFamily: 'SpaceMono', fontSize: 11, letterSpacing: 0.5 },
  nextBloomInline: { borderTopWidth: 1, marginTop: 8, paddingTop: 16, paddingHorizontal: 0, gap: 10 },
  nextBloomRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  nextBloomCount: { fontFamily: 'SpaceMono', fontSize: 32, fontWeight: '700', lineHeight: 36 },
  nextBloomLabel: { fontFamily: 'SpaceMono', fontSize: 12, letterSpacing: 0.5 },
  progressTrack: { height: 2, width: '100%', borderRadius: 1, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 1 },
  emptyCard: { width: '100%' },
  emptyBlock: { padding: 24, alignItems: 'center', gap: 12 },
  emptyGlyph: { fontSize: 28, lineHeight: 34 },
  emptyText: { fontFamily: 'CourierPrime', fontSize: 13, textAlign: 'center', lineHeight: 21 },
  insightCard: { width: '100%' },
  insightInner: { padding: 16, gap: 6 },
  insightEmpty: { fontFamily: 'CourierPrime', fontSize: 13, lineHeight: 20, textAlign: 'center', padding: 20 },
  insightText: { fontFamily: 'CourierPrime', fontSize: 13, lineHeight: 20 },
  insightMeta: { fontFamily: 'SpaceMono', fontSize: 10, letterSpacing: 0.5 },
  ageNote: { fontFamily: 'SpaceMono', fontSize: 11, letterSpacing: 0.5, textAlign: 'center', lineHeight: 16, marginTop: 4 },
  privacyNote: { borderTopWidth: 1, paddingTop: 16, marginTop: 8, alignItems: 'center', gap: 6 },
  privacyText: { fontFamily: 'SpaceMono', fontSize: 10, letterSpacing: 1, textAlign: 'center' },
  privacyLink: { fontFamily: 'SpaceMono', fontSize: 10, letterSpacing: 1.5 },

  // ── Weekly review ─────────────────────────────────────────────────────────
  lastWeekRow: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  lastWeekLabel: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 0.5 },
  lastWeekScore: { fontFamily: 'CourierPrime', fontSize: 13, fontWeight: '700' },
  lastWeekWin: { fontFamily: 'CourierPrime', fontSize: 11, flex: 1, fontStyle: 'italic' },
  reviewInner: { padding: 16, gap: 10 },
  reviewAreaRow: { gap: 6 },
  reviewAreaLabel: { fontFamily: 'CourierPrime', fontSize: 12, letterSpacing: 0.3 },
  reviewPills: { flexDirection: 'row', gap: 3, flexWrap: 'wrap' },
  reviewPill: {
    borderWidth: 1,
    borderRadius: 5,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewPillNum: { fontFamily: 'CourierPrime', fontSize: 11, fontWeight: '700' },
  avgRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, borderTopWidth: 1, paddingTop: 12 },
  avgLabel: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 0.5 },
  avgScore: { fontFamily: 'CourierPrime', fontSize: 20, fontWeight: '700' },
  reviewQuestion: { fontFamily: 'CourierPrime', fontSize: 12, letterSpacing: 0.3 },
  reviewInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontFamily: 'CourierPrime',
    fontSize: 13,
    lineHeight: 20,
    minHeight: 52,
    textAlignVertical: 'top',
  },
  reviewSaveBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  reviewSaveTxt: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'lowercase',
  },
});
