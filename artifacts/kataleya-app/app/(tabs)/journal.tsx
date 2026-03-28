import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useCircadian } from '@/hooks/useCircadian';
import { useOrchidSway } from '@/hooks/useOrchidSway';
import { TAB_BAR_HEIGHT } from '@/constants/circadian';
import { Sanctuary, MoodLog, JournalEntry } from '@/utils/storage';
import { suppressReminderForToday } from '@/hooks/useNotifications';

const MOOD_STATES = [
  { score: 2,  label: 'crisis',    color: '#ff6b6b', desc: 'overwhelmed' },
  { score: 4,  label: 'turbulent', color: '#f09060', desc: 'struggling' },
  { score: 6,  label: 'shifting',  color: '#a09060', desc: 'uncertain' },
  { score: 8,  label: 'steady',    color: '#7fc9c9', desc: 'present' },
  { score: 10, label: 'grounded',  color: '#4ade80', desc: 'anchored' },
];

function formatTs(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffH = (now.getTime() - ts) / 3600000;
  if (diffH < 1) return `${Math.floor(diffH * 60)}m ago`;
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function moodColor(score: number): string {
  const m = MOOD_STATES.find(s => s.score === score);
  if (m) return m.color;
  const closest = MOOD_STATES.reduce((a, b) =>
    Math.abs(b.score - score) < Math.abs(a.score - score) ? b : a
  );
  return closest.color;
}

function moodLabel(score: number): string {
  const m = MOOD_STATES.find(s => s.score === score);
  return m?.label ?? String(score);
}

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const { theme, phase } = useCircadian();
  const { restlessnessScore } = useOrchidSway();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + TAB_BAR_HEIGHT : insets.bottom + TAB_BAR_HEIGHT;

  // ── Mood state ──────────────────────────────────────────────────────────────
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [moodNote, setMoodNote] = useState('');
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [savingMood, setSavingMood] = useState(false);
  const [moodLogsExpanded, setMoodLogsExpanded] = useState(false);

  // ── Journal state ──────────────────────────────────────────────────────────
  const [journalBody, setJournalBody] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [savingEntry, setSavingEntry] = useState(false);
  const [journalExpanded, setJournalExpanded] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide  = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const loadData = useCallback(async () => {
    const [logs, journal] = await Promise.all([
      Sanctuary.getMoodLogs(),
      Sanctuary.getJournalEntries(),
    ]);
    setMoodLogs(logs);
    setEntries(journal);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSaveMood = async () => {
    if (selectedMood === null) return;
    setSavingMood(true);
    Keyboard.dismiss();
    await Sanctuary.saveMoodLog({
      ts: Date.now(),
      moodScore: selectedMood,
      context: moodNote.trim() || undefined,
      circadianPhase: phase,
      restlessness: restlessnessScore,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedMood(null);
    setMoodNote('');
    setSavingMood(false);
    // User has logged — cancel today's evening reminder so it doesn't fire again.
    // The reminder reschedules automatically on the next app open if not logged.
    suppressReminderForToday();
    await loadData();
  };

  const handleSaveEntry = async () => {
    if (!journalBody.trim()) return;
    setSavingEntry(true);
    Keyboard.dismiss();
    await Sanctuary.saveJournalEntry({
      ts: Date.now(),
      body: journalBody.trim(),
      moodScore: selectedMood ?? undefined,
      circadianPhase: phase,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setJournalBody('');
    setSavingEntry(false);
    await loadData();
  };

  const handleDeleteEntry = (id: string) => {
    Alert.alert(
      'Delete entry',
      'This cannot be undone.',
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'delete',
          style: 'destructive',
          onPress: async () => {
            await Sanctuary.deleteJournalEntry(id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await loadData();
          },
        },
      ],
      { cancelable: true }
    );
  };

  const visibleLogs    = moodLogsExpanded ? moodLogs : moodLogs.slice(0, 5);
  const visibleEntries = journalExpanded  ? entries   : entries.slice(0, 3);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── MOOD LOG ──────────────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>mood log</Text>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardInner}>
            <Text style={[styles.cardHint, { color: theme.textMuted }]}>
              Recorded locally. Never shared. Not visible to sponsor.
            </Text>

            <View style={styles.moodRow}>
              {MOOD_STATES.map(m => (
                <TouchableOpacity
                  key={m.score}
                  style={[
                    styles.moodBtn,
                    {
                      borderColor: selectedMood === m.score ? m.color : `${theme.border}80`,
                      backgroundColor: selectedMood === m.score ? `${m.color}20` : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    setSelectedMood(selectedMood === m.score ? null : m.score);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[styles.moodBtnLabel, { color: selectedMood === m.score ? m.color : theme.textMuted }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={moodNote}
              onChangeText={setMoodNote}
              placeholder="optional note…"
              placeholderTextColor={`${theme.textMuted}60`}
              multiline
              maxLength={280}
              style={[styles.noteInput, { color: theme.text, borderColor: `${theme.border}60`, backgroundColor: `${theme.bg}80` }]}
            />

            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  borderColor: selectedMood !== null ? theme.accent : `${theme.border}50`,
                  backgroundColor: selectedMood !== null ? `${theme.accent}12` : 'transparent',
                  opacity: selectedMood !== null ? 1 : 0.4,
                },
              ]}
              onPress={handleSaveMood}
              disabled={selectedMood === null || savingMood}
            >
              <Text style={[styles.saveBtnText, { color: theme.accent }]}>
                {savingMood ? 'recording…' : 'record mood'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {moodLogs.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {visibleLogs.map((log, i) => (
              <View
                key={log.id}
                style={[
                  styles.logRow,
                  i < visibleLogs.length - 1 && { borderBottomWidth: 1, borderBottomColor: `${theme.border}40` },
                ]}
              >
                <View style={[styles.logDot, { backgroundColor: moodColor(log.moodScore) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.logLabel, { color: moodColor(log.moodScore) }]}>
                    {moodLabel(log.moodScore)}
                    <Text style={[styles.logPhase, { color: theme.textMuted }]}> · {log.circadianPhase}</Text>
                  </Text>
                  {log.context ? (
                    <Text style={[styles.logNote, { color: theme.textMuted }]} numberOfLines={2}>
                      {log.context}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.logTime, { color: theme.textMuted }]}>{formatTs(log.ts)}</Text>
              </View>
            ))}
            {moodLogs.length > 5 && (
              <TouchableOpacity
                style={[styles.expandBtn, { borderTopColor: `${theme.border}40` }]}
                onPress={() => setMoodLogsExpanded(e => !e)}
              >
                <Text style={[styles.expandText, { color: theme.textMuted }]}>
                  {moodLogsExpanded ? '↑ show less' : `↓ ${moodLogs.length - 5} more`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── PRIVATE JOURNAL ───────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 24 }]}>private journal</Text>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardInner}>
            <Text style={[styles.cardHint, { color: theme.textMuted }]}>
              Stored locally. Zero network access. No account, no cloud.
            </Text>

            <TextInput
              value={journalBody}
              onChangeText={setJournalBody}
              placeholder="what needs to be said…"
              placeholderTextColor={`${theme.textMuted}60`}
              multiline
              maxLength={4000}
              style={[styles.journalInput, { color: theme.text, borderColor: `${theme.border}60`, backgroundColor: `${theme.bg}80` }]}
              textAlignVertical="top"
            />

            <View style={styles.journalFooter}>
              <Text style={[styles.charCount, { color: theme.textMuted }]}>
                {journalBody.length} / 4000
              </Text>
              {keyboardVisible && (
                <TouchableOpacity
                  onPress={() => Keyboard.dismiss()}
                  hitSlop={12}
                  style={[styles.kbDismissBtn, { borderColor: `${theme.border}50` }]}
                >
                  <Text style={[styles.kbDismissText, { color: `${theme.textMuted}80` }]}>⌨ ↓</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {
                    borderColor: journalBody.trim() ? theme.accent : `${theme.border}50`,
                    backgroundColor: journalBody.trim() ? `${theme.accent}12` : 'transparent',
                    opacity: journalBody.trim() ? 1 : 0.4,
                    paddingHorizontal: 20,
                  },
                ]}
                onPress={handleSaveEntry}
                disabled={!journalBody.trim() || savingEntry}
              >
                <Text style={[styles.saveBtnText, { color: theme.accent }]}>
                  {savingEntry ? 'sealing…' : 'seal entry'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {entries.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {visibleEntries.map((entry, i) => (
              <View
                key={entry.id}
                style={[
                  styles.entryRow,
                  i < visibleEntries.length - 1 && { borderBottomWidth: 1, borderBottomColor: `${theme.border}40` },
                ]}
              >
                <View style={styles.entryMeta}>
                  <Text style={[styles.entryTime, { color: theme.textMuted }]}>{formatTs(entry.ts)}</Text>
                  {entry.moodScore != null && (
                    <Text style={[styles.entryMoodBadge, { color: moodColor(entry.moodScore), borderColor: `${moodColor(entry.moodScore)}40` }]}>
                      {moodLabel(entry.moodScore)}
                    </Text>
                  )}
                  <Text style={[styles.entryPhase, { color: theme.textMuted }]}>{entry.circadianPhase}</Text>
                  <TouchableOpacity onPress={() => handleDeleteEntry(entry.id)} hitSlop={8}>
                    <Text style={[styles.deleteBtn, { color: `${theme.textMuted}60` }]}>×</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.entryBody, { color: theme.text }]} numberOfLines={journalExpanded ? undefined : 4}>
                  {entry.body}
                </Text>
              </View>
            ))}
            {entries.length > 3 && (
              <TouchableOpacity
                style={[styles.expandBtn, { borderTopColor: `${theme.border}40` }]}
                onPress={() => setJournalExpanded(e => !e)}
              >
                <Text style={[styles.expandText, { color: theme.textMuted }]}>
                  {journalExpanded ? '↑ show less' : `↓ ${entries.length - 3} more entries`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={[styles.privacyNote, { borderColor: `${theme.border}60` }]}>
          <Text style={[styles.privacyText, { color: theme.textMuted }]}>
            Sanctuary · stored locally · never leaves this device
          </Text>
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
  card: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  cardInner: { padding: 16, gap: 12 },
  cardHint: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 0.5,
    lineHeight: 15,
    opacity: 0.8,
  },

  // Mood
  moodRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  moodBtn: {
    flex: 1,
    minWidth: 56,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  moodBtnLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  noteInput: {
    fontFamily: 'CourierPrime',
    fontSize: 12,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 52,
    lineHeight: 18,
  },
  saveBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  saveBtnText: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Mood log list
  logRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 10,
  },
  logDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4, flexShrink: 0 },
  logLabel: { fontFamily: 'CourierPrime', fontSize: 12 },
  logPhase: { fontSize: 10 },
  logNote: { fontFamily: 'CourierPrime', fontSize: 10, lineHeight: 15, marginTop: 2 },
  logTime: { fontFamily: 'CourierPrime', fontSize: 10, flexShrink: 0 },
  expandBtn: { borderTopWidth: 1, paddingVertical: 11, alignItems: 'center' },
  expandText: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1 },

  // Journal
  journalInput: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    lineHeight: 20,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
  },
  journalFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 },
  charCount: { fontFamily: 'CourierPrime', fontSize: 10, flex: 1 },
  kbDismissBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  kbDismissText: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 1,
  },

  // Journal entries
  entryRow: { padding: 14, gap: 8 },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  entryTime: { fontFamily: 'CourierPrime', fontSize: 10 },
  entryMoodBadge: {
    fontFamily: 'CourierPrime',
    fontSize: 9,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    letterSpacing: 0.5,
  },
  entryPhase: { fontFamily: 'CourierPrime', fontSize: 9, flex: 1 },
  deleteBtn: { fontFamily: 'CourierPrime', fontSize: 18, lineHeight: 20 },
  entryBody: { fontFamily: 'CourierPrime', fontSize: 12, lineHeight: 19 },

  // Footer
  privacyNote: { borderTopWidth: 1, paddingTop: 16, marginTop: 8, alignItems: 'center' },
  privacyText: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1, textAlign: 'center', lineHeight: 16 },
});
