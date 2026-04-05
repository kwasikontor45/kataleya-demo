import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCircadian } from '@/hooks/useCircadian';
import { useSobriety } from '@/hooks/useSobriety';
import { useInsights } from '@/hooks/useInsights';
import { TAB_BAR_HEIGHT } from '@/constants/circadian';
import { NeonCard, NEON_RGB } from '@/components/NeonCard';
import { GlyphIcon, milestoneGlyph } from '@/components/GlyphIcon';

function phaseAccentRgb(phase: string): string {
  if (phase === 'goldenHour') return NEON_RGB.amber;
  if (phase === 'night')      return NEON_RGB.violet;
  if (phase === 'dawn')       return NEON_RGB.pink;
  return NEON_RGB.cyan;
}

// Confidence → glow intensity for insight cards
function confidenceToIntensity(confidence: number): number {
  return 0.04 + confidence * 0.1;
}

export default function GrowthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, phase } = useCircadian();
  const { sobriety } = useSobriety();
  const { insights, loading: insightsLoading, dataAgeDays, hasEnoughData } = useInsights();
  const accentRgb = phaseAccentRgb(phase);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + TAB_BAR_HEIGHT : insets.bottom + TAB_BAR_HEIGHT;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
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
          </View>
        </NeonCard>

        {/* Next milestone */}
        {sobriety.nextMilestone && (
          <>
            <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)`, marginTop: 24 }]}>next bloom</Text>
            <NeonCard theme={theme} accentRgb={accentRgb} style={styles.nextCard}>
              <View style={styles.nextBloom}>
                <Text style={[styles.nextDays, { color: `rgba(${accentRgb},0.95)` }]}>
                  {sobriety.nextMilestone.days - sobriety.daysSober}
                </Text>
                <Text style={[styles.nextLabel, { color: `rgba(${accentRgb},0.5)` }]}>
                  days until {sobriety.nextMilestone.label}
                </Text>
                <View style={[styles.progressTrack, { backgroundColor: `rgba(${accentRgb},0.1)` }]}>
                  <View style={[styles.progressFill, { width: `${sobriety.progressToNext * 100}%`, backgroundColor: `rgba(${accentRgb},0.65)` }]} />
                </View>
              </View>
            </NeonCard>
          </>
        )}

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
  scroll: { paddingHorizontal: 20, gap: 8 },
  sectionLabel: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 },
  timelineCard: { width: '100%' },
  timelineInner: { padding: 16, gap: 0 },
  milestoneItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, minHeight: 44 },
  milestoneLeft: { alignItems: 'center', width: 12, paddingTop: 4 },
  milestoneLine: { position: 'absolute', top: 16, width: 1, height: 36 },
  milestoneDot: { flexShrink: 0 },
  milestoneContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12 },
  milestoneLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  milestoneLabel: { fontFamily: 'CourierPrime', fontSize: 13 },
  milestoneDays: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 0.5 },
  nextCard: { width: '100%' },
  nextBloom: { padding: 20, alignItems: 'center', gap: 8 },
  nextDays: { fontFamily: 'CourierPrime', fontSize: 48, fontWeight: '700', lineHeight: 56 },
  nextLabel: { fontFamily: 'CourierPrime', fontSize: 12, letterSpacing: 1 },
  progressTrack: { height: 2, width: '100%', borderRadius: 1, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 1 },
  emptyCard: { width: '100%' },
  emptyBlock: { padding: 24, alignItems: 'center', gap: 12 },
  emptyGlyph: { fontSize: 28, lineHeight: 34 },
  emptyText: { fontFamily: 'CourierPrime', fontSize: 13, textAlign: 'center', lineHeight: 21 },
  insightCard: { width: '100%' },
  insightInner: { padding: 16, gap: 6 },
  insightEmpty: { fontFamily: 'CourierPrime', fontSize: 13, lineHeight: 20, textAlign: 'center', padding: 20 },
  insightText: { fontFamily: 'CourierPrime', fontSize: 13, lineHeight: 20 },
  insightMeta: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 0.5 },
  ageNote: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 0.5, textAlign: 'center', lineHeight: 16, marginTop: 4 },
  privacyNote: { borderTopWidth: 1, paddingTop: 16, marginTop: 8, alignItems: 'center', gap: 6 },
  privacyText: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1, textAlign: 'center' },
  privacyLink: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1.5 },
});
