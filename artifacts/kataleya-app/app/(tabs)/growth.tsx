import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCircadian } from '@/hooks/useCircadian';
import { useSobriety } from '@/hooks/useSobriety';
import { useInsights } from '@/hooks/useInsights';
import { TAB_BAR_HEIGHT } from '@/constants/circadian';

export default function GrowthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useCircadian();
  const { sobriety } = useSobriety();
  const { insights, loading: insightsLoading, dataAgeDays, hasEnoughData } = useInsights();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + TAB_BAR_HEIGHT : insets.bottom + TAB_BAR_HEIGHT;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>season of growth</Text>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {sobriety.milestones.map((m, i) => (
            <View
              key={m.days}
              style={[
                styles.milestoneRow,
                i < sobriety.milestones.length - 1 && { borderBottomWidth: 1, borderBottomColor: `${theme.border}60` },
                !m.achieved && { opacity: 0.35 },
              ]}
            >
              <View style={styles.milestoneLeft}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: m.achieved ? theme.accent : theme.border },
                    m.achieved && { shadowColor: theme.accent, shadowRadius: 6, shadowOpacity: 0.5, elevation: 3 },
                  ]}
                />
                <Text style={[styles.milestoneLabel, { color: theme.text }]}>{m.label}</Text>
              </View>
              <Text style={[styles.milestoneDays, { color: theme.textMuted }]}>
                {m.days} {m.days === 1 ? 'day' : 'days'}
              </Text>
            </View>
          ))}
        </View>

        {sobriety.nextMilestone && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 24 }]}>next bloom</Text>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.nextBloom}>
                <Text style={[styles.nextDays, { color: theme.accent }]}>
                  {sobriety.nextMilestone.days - sobriety.daysSober}
                </Text>
                <Text style={[styles.nextLabel, { color: theme.textMuted }]}>
                  days until {sobriety.nextMilestone.label}
                </Text>
                <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                  <View
                    style={[styles.progressFill, { width: `${sobriety.progressToNext * 100}%`, backgroundColor: theme.accent }]}
                  />
                </View>
              </View>
            </View>
          </>
        )}

        {!sobriety.startDate && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.emptyBlock}>
              <Text style={[styles.emptyGlyph, { color: `${theme.accent}50` }]}>⟡</Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                the season hasn't begun yet.{'\n'}
                plant your date in the sanctuary and growth appears here.
              </Text>
            </View>
          </View>
        )}

        {/* ── Insights section ────────────────────────────────────────── */}
        {!insightsLoading && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 24 }]}>patterns</Text>

            {!hasEnoughData ? (
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.insightEmpty, { color: theme.textMuted }]}>
                  patterns form in silence.{'\n'}
                  log your mood for a few days and they'll surface here — no server, no model, just your data.
                </Text>
              </View>
            ) : (
              <>
                {insights.length === 0 ? (
                  <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.insightEmpty, { color: theme.textMuted }]}>
                      No patterns strong enough to surface yet. Keep logging.
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    {insights.map((ins, i) => (
                      <View
                        key={ins.id}
                        style={[
                          styles.insightRow,
                          i < insights.length - 1 && { borderBottomWidth: 1, borderBottomColor: `${theme.border}60` },
                        ]}
                      >
                        <Text style={[styles.insightText, { color: theme.text }]}>{ins.message}</Text>
                        <Text style={[styles.insightMeta, { color: theme.textMuted }]}>
                          {ins.n} observations · {Math.round(ins.confidence * 100)}% confidence
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {dataAgeDays > 30 && (
                  <Text style={[styles.insightAgeNote, { color: theme.textMuted }]}>
                    Based on your logs from {dataAgeDays} days ago. Log today to refresh.
                  </Text>
                )}
              </>
            )}
          </>
        )}

        <View style={[styles.privacyNote, { borderColor: `${theme.border}60` }]}>
          <Text style={[styles.privacyText, { color: theme.textMuted }]}>
            all growth data lives only on this device
          </Text>
          <TouchableOpacity onPress={() => router.push('/privacy')} hitSlop={8}>
            <Text style={[styles.privacyLink, { color: `${theme.textMuted}55` }]}>privacy →</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 8 },
  sectionLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  milestoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  milestoneLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    flexShrink: 1,
  },
  milestoneDays: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 0.5,
    flexShrink: 0,
    marginLeft: 8,
  },
  nextBloom: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  nextDays: {
    fontFamily: 'CourierPrime',
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 56,
  },
  nextLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 12,
    letterSpacing: 1,
  },
  progressTrack: {
    height: 2,
    width: '100%',
    borderRadius: 1,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1,
  },
  emptyBlock: { padding: 24, alignItems: 'center', gap: 12 },
  emptyGlyph: { fontSize: 28, lineHeight: 34 },
  emptyText: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 21,
  },
  privacyNote: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 8,
    alignItems: 'center',
    gap: 6,
  },
  privacyText: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 1,
    textAlign: 'center',
  },
  privacyLink: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  insightEmpty: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    padding: 20,
  },
  insightRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  insightText: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    lineHeight: 20,
  },
  insightMeta: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  insightAgeNote: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 4,
    opacity: 0.7,
  },
});

