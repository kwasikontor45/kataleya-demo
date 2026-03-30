import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Alert, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useCircadian } from '@/hooks/useCircadian';
import { useOrchidSway } from '@/hooks/useOrchidSway';
import { TAB_BAR_HEIGHT } from '@/constants/circadian';
import { Sanctuary, MoodLog, JournalEntry } from '@/utils/storage';
import { suppressReminderForToday } from '@/hooks/useNotifications';
import { NeonCard, NEON_RGB } from '@/components/NeonCard';

const MOOD_STATES = [
  { score: 2,  label: 'crisis',    rgb: '255,107,107' },
  { score: 4,  label: 'turbulent', rgb: '240,144,96'  },
  { score: 6,  label: 'shifting',  rgb: '160,144,96'  },
  { score: 8,  label: 'steady',    rgb: '127,201,201' },
  { score: 10, label: 'grounded',  rgb: '74,222,128'  },
];

function formatTs(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffH = (now.getTime() - ts) / 3600000;
  if (diffH < 1) return `${Math.floor(diffH * 60)}m ago`;
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function moodRgb(score: number): string {
  const m = MOOD_STATES.find(s => s.score === score);
  if (m) return m.rgb;
  return MOOD_STATES.reduce((a, b) => Math.abs(b.score - score) < Math.abs(a.score - score) ? b : a).rgb;
}
function moodLabel(score: number): string {
  return MOOD_STATES.find(s => s.score === score)?.label ?? String(score);
}
function phaseAccentRgb(phase: string): string {
  if (phase === 'goldenHour') return NEON_RGB.amber;
  if (phase === 'night')      return NEON_RGB.violet;
  if (phase === 'dawn')       return NEON_RGB.pink;
  return NEON_RGB.cyan;
}

function KbDismiss({ accentRgb }: { accentRgb: string }) {
  return (
    <TouchableOpacity onPress={() => Keyboard.dismiss()} hitSlop={12}
      style={[styles.kbBtn, { borderColor: `rgba(${accentRgb},0.25)` }]}>
      <Text style={[styles.kbText, { color: `rgba(${accentRgb},0.5)` }]}>⌨ ↓</Text>
    </TouchableOpacity>
  );
}

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const { theme, phase } = useCircadian();
  const { restlessnessScore } = useOrchidSway();
  const scrollRef = useRef<ScrollView>(null);
  const accentRgb = phaseAccentRgb(phase);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + TAB_BAR_HEIGHT : insets.bottom + TAB_BAR_HEIGHT;

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [moodNote, setMoodNote] = useState('');
  const [moodNoteFocused, setMoodNoteFocused] = useState(false);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [savingMood, setSavingMood] = useState(false);
  const [moodLogsExpanded, setMoodLogsExpanded] = useState(false);
  const [journalBody, setJournalBody] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [savingEntry, setSavingEntry] = useState(false);
  const [journalExpanded, setJournalExpanded] = useState(false);
  const [journalFocused, setJournalFocused] = useState(false);
  const keyboardVisible = moodNoteFocused || journalFocused;

  const loadData = useCallback(async () => {
    const [logs, journal] = await Promise.all([Sanctuary.getMoodLogs(), Sanctuary.getJournalEntries()]);
    setMoodLogs(logs); setEntries(journal);
  }, []);
  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveMood = async () => {
    if (selectedMood === null) return;
    setSavingMood(true); Keyboard.dismiss();
    await Sanctuary.saveMoodLog({ ts: Date.now(), moodScore: selectedMood, context: moodNote.trim() || undefined, circadianPhase: phase, restlessness: restlessnessScore });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSelectedMood(null); setMoodNote(''); setSavingMood(false);
    suppressReminderForToday(); await loadData();
  };

  const handleSaveEntry = async () => {
    if (!journalBody.trim()) return;
    setSavingEntry(true); Keyboard.dismiss();
    await Sanctuary.saveJournalEntry({ ts: Date.now(), body: journalBody.trim(), moodScore: selectedMood ?? undefined, circadianPhase: phase });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setJournalBody(''); setSavingEntry(false); await loadData();
  };

  const handleDeleteEntry = (id: string) => {
    Alert.alert('delete entry', 'this cannot be undone.', [
      { text: 'cancel', style: 'cancel' },
      { text: 'delete', style: 'destructive', onPress: async () => {
        await Sanctuary.deleteJournalEntry(id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); await loadData();
      }},
    ], { cancelable: true });
  };

  const visibleLogs = moodLogsExpanded ? moodLogs : moodLogs.slice(0, 5);
  const visibleEntries = journalExpanded ? entries : entries.slice(0, 3);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}>
        <ScrollView ref={scrollRef} contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 16 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="always">

          <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)` }]}>how are you?</Text>

          <NeonCard theme={theme} accentRgb={accentRgb} style={styles.card}>
            <View style={styles.cardInner}>
              <Text style={[styles.hint, { color: `${theme.textMuted}70` }]}>recorded locally · never shared · not visible to sponsor</Text>
              <View style={styles.moodRow}>
                {MOOD_STATES.map(m => {
                  const sel = selectedMood === m.score;
                  return (
                    <TouchableOpacity key={m.score} style={[styles.moodBtn, { borderColor: `rgba(${m.rgb},${sel?0.7:0.2})`, backgroundColor: `rgba(${m.rgb},${sel?0.14:0.04})` }]}
                      onPress={() => { setSelectedMood(sel ? null : m.score); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                      <Text style={[styles.moodBtnLabel, { color: `rgba(${m.rgb},${sel?0.95:0.45})` }]}>{m.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {restlessnessScore > 0.15 && (
                <View style={styles.restlessRow}>
                  <View style={[styles.restlessTrack, { backgroundColor: `rgba(${accentRgb},0.1)` }]}>
                    <View style={[styles.restlessFill, { width: `${Math.round(restlessnessScore * 100)}%`, backgroundColor: `rgba(${accentRgb},0.5)` }]} />
                  </View>
                  <Text style={[styles.restlessLabel, { color: `rgba(${accentRgb},0.4)` }]}>restless</Text>
                </View>
              )}
              <TextInput value={moodNote} onChangeText={setMoodNote} onFocus={() => setMoodNoteFocused(true)} onBlur={() => setMoodNoteFocused(false)}
                placeholder="a note, if you want one..." placeholderTextColor={`rgba(${accentRgb},0.25)`} multiline maxLength={280}
                style={[styles.noteInput, { color: theme.text, borderColor: `rgba(${accentRgb},${moodNoteFocused?0.4:0.12})`, backgroundColor: `rgba(${accentRgb},0.04)` }]} />
              {moodNoteFocused && (
                <View style={styles.noteActions}>
                  <Text style={[styles.charHint, { color: `rgba(${accentRgb},0.35)` }]}>{moodNote.length} / 280</Text>
                  <KbDismiss accentRgb={accentRgb} />
                </View>
              )}
              <TouchableOpacity style={[styles.saveBtn, { borderColor: `rgba(${accentRgb},${selectedMood!==null?0.45:0.12})`, backgroundColor: `rgba(${accentRgb},${selectedMood!==null?0.1:0})`, opacity: selectedMood !== null ? 1 : 0.4 }]}
                onPress={handleSaveMood} disabled={selectedMood === null || savingMood}>
                <Text style={[styles.saveBtnText, { color: `rgba(${accentRgb},${selectedMood!==null?0.9:0.4})` }]}>
                  {savingMood ? 'recording…' : selectedMood !== null ? `record · ${moodLabel(selectedMood)}` : 'select a mood above'}
                </Text>
              </TouchableOpacity>
            </View>
          </NeonCard>

          {moodLogs.length === 0 ? (
            <View style={[styles.emptyCard, { borderColor: `rgba(${accentRgb},0.1)` }]}>
              <Text style={[styles.emptyText, { color: `${theme.textMuted}55` }]}>no mood has been recorded yet.{'\n'}your first log appears here when you do.</Text>
            </View>
          ) : (
            <NeonCard theme={theme} accentRgb={accentRgb} fillIntensity={0.03} borderIntensity={0.1}>
              {visibleLogs.map((log, i) => (
                <View key={log.id} style={[styles.logRow, i < visibleLogs.length - 1 && { borderBottomWidth: 1, borderBottomColor: `rgba(${accentRgb},0.08)` }]}>
                  <View style={[styles.logBar, { backgroundColor: `rgba(${moodRgb(log.moodScore)},0.6)` }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.logLabel, { color: `rgba(${moodRgb(log.moodScore)},0.9)` }]}>{moodLabel(log.moodScore)}<Text style={[styles.logPhase, { color: `${theme.textMuted}70` }]}> · {log.circadianPhase}</Text></Text>
                    {log.context ? <Text style={[styles.logNote, { color: `${theme.textMuted}70` }]} numberOfLines={2}>{log.context}</Text> : null}
                  </View>
                  <Text style={[styles.logTime, { color: `${theme.textMuted}55` }]}>{formatTs(log.ts)}</Text>
                </View>
              ))}
              {moodLogs.length > 5 && (
                <TouchableOpacity style={[styles.expandBtn, { borderTopColor: `rgba(${accentRgb},0.1)` }]} onPress={() => setMoodLogsExpanded(e => !e)}>
                  <Text style={[styles.expandText, { color: `rgba(${accentRgb},0.5)` }]}>{moodLogsExpanded ? '↑ show less' : `↓ ${moodLogs.length - 5} more`}</Text>
                </TouchableOpacity>
              )}
            </NeonCard>
          )}

          <Text style={[styles.sectionLabel, { color: `rgba(${NEON_RGB.violet},0.5)`, marginTop: 24 }]}>private journal</Text>

          <NeonCard theme={theme} glowColor="violet" style={styles.card}>
            <View style={styles.cardInner}>
              <Text style={[styles.hint, { color: `${theme.textMuted}70` }]}>stored locally · zero network access · no account, no cloud</Text>
              <TextInput value={journalBody} onChangeText={setJournalBody} onFocus={() => setJournalFocused(true)} onBlur={() => setJournalFocused(false)}
                placeholder="what needs to be said..." placeholderTextColor={`rgba(${NEON_RGB.violet},0.25)`} multiline maxLength={4000}
                style={[styles.journalInput, { color: theme.text, borderColor: `rgba(${NEON_RGB.violet},${journalFocused?0.4:0.12})`, backgroundColor: `rgba(${NEON_RGB.violet},0.04)` }]}
                textAlignVertical="top" />
              <View style={styles.journalFooter}>
                <Text style={[styles.charCount, { color: `rgba(${NEON_RGB.violet},0.35)` }]}>{journalBody.length} / 4000</Text>
                {keyboardVisible && <KbDismiss accentRgb={NEON_RGB.violet} />}
                <TouchableOpacity style={[styles.saveBtn, { borderColor: `rgba(${NEON_RGB.violet},${journalBody.trim()?0.45:0.12})`, backgroundColor: `rgba(${NEON_RGB.violet},${journalBody.trim()?0.1:0})`, opacity: journalBody.trim() ? 1 : 0.4, paddingHorizontal: 20 }]}
                  onPress={handleSaveEntry} disabled={!journalBody.trim() || savingEntry}>
                  <Text style={[styles.saveBtnText, { color: `rgba(${NEON_RGB.violet},${journalBody.trim()?0.9:0.4})` }]}>{savingEntry ? 'sealing…' : 'seal entry'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </NeonCard>

          {entries.length === 0 ? (
            <View style={[styles.emptyCard, { borderColor: `rgba(${NEON_RGB.violet},0.1)` }]}>
              <Text style={[styles.emptyText, { color: `${theme.textMuted}55` }]}>the page is clear.{'\n'}when you seal your first entry, it appears here.</Text>
            </View>
          ) : (
            <NeonCard theme={theme} glowColor="violet" fillIntensity={0.03} borderIntensity={0.1}>
              {visibleEntries.map((entry, i) => (
                <View key={entry.id} style={[styles.entryRow, i < visibleEntries.length - 1 && { borderBottomWidth: 1, borderBottomColor: `rgba(${NEON_RGB.violet},0.08)` }]}>
                  <View style={styles.entryMeta}>
                    <Text style={[styles.entryTime, { color: `${theme.textMuted}65` }]}>{formatTs(entry.ts)}</Text>
                    {entry.moodScore != null && (
                      <Text style={[styles.entryMoodBadge, { color: `rgba(${moodRgb(entry.moodScore)},0.85)`, borderColor: `rgba(${moodRgb(entry.moodScore)},0.3)` }]}>{moodLabel(entry.moodScore)}</Text>
                    )}
                    <Text style={[styles.entryPhase, { color: `${theme.textMuted}55` }]}>{entry.circadianPhase}</Text>
                    <TouchableOpacity onPress={() => handleDeleteEntry(entry.id)} hitSlop={8}>
                      <Text style={[styles.deleteBtn, { color: `${theme.textMuted}40` }]}>×</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.entryBody, { color: `${theme.text}cc` }]} numberOfLines={journalExpanded ? undefined : 4}>{entry.body}</Text>
                </View>
              ))}
              {entries.length > 3 && (
                <TouchableOpacity style={[styles.expandBtn, { borderTopColor: `rgba(${NEON_RGB.violet},0.1)` }]} onPress={() => setJournalExpanded(e => !e)}>
                  <Text style={[styles.expandText, { color: `rgba(${NEON_RGB.violet},0.5)` }]}>{journalExpanded ? '↑ show less' : `↓ ${entries.length - 3} more entries`}</Text>
                </TouchableOpacity>
              )}
            </NeonCard>
          )}

          <View style={[styles.privacyNote, { borderColor: `rgba(${accentRgb},0.1)` }]}>
            <Text style={[styles.privacyText, { color: `${theme.textMuted}45` }]}>Sanctuary · stored locally · never leaves this device</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 8 },
  sectionLabel: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 },
  card: { width: '100%' },
  cardInner: { padding: 16, gap: 12 },
  hint: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 0.5, lineHeight: 15 },
  moodRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  moodBtn: { flex: 1, minWidth: 56, borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  moodBtnLabel: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 0.5 },
  restlessRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  restlessTrack: { flex: 1, height: 2, borderRadius: 1, overflow: 'hidden' },
  restlessFill: { height: '100%', borderRadius: 1 },
  restlessLabel: { fontFamily: 'CourierPrime', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' },
  noteInput: { fontFamily: 'CourierPrime', fontSize: 12, borderWidth: 1, borderRadius: 8, padding: 10, minHeight: 56, lineHeight: 18 },
  noteActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 2 },
  charHint: { fontFamily: 'CourierPrime', fontSize: 10 },
  saveBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
  emptyCard: { borderWidth: 1, borderRadius: 12 },
  emptyText: { fontFamily: 'CourierPrime', fontSize: 12, lineHeight: 19, textAlign: 'center', padding: 20 },
  logRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 11, paddingHorizontal: 14, gap: 10 },
  logBar: { width: 2, alignSelf: 'stretch', borderRadius: 1, minHeight: 20, flexShrink: 0 },
  logLabel: { fontFamily: 'CourierPrime', fontSize: 12 },
  logPhase: { fontSize: 10 },
  logNote: { fontFamily: 'CourierPrime', fontSize: 10, lineHeight: 15, marginTop: 2 },
  logTime: { fontFamily: 'CourierPrime', fontSize: 10, flexShrink: 0 },
  expandBtn: { borderTopWidth: 1, paddingVertical: 11, alignItems: 'center' },
  expandText: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1 },
  journalInput: { fontFamily: 'CourierPrime', fontSize: 13, lineHeight: 20, borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 120 },
  journalFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10 },
  charCount: { fontFamily: 'CourierPrime', fontSize: 10, flex: 1 },
  kbBtn: { borderWidth: 1, borderRadius: 6, paddingVertical: 5, paddingHorizontal: 9 },
  kbText: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1 },
  entryRow: { padding: 14, gap: 8 },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  entryTime: { fontFamily: 'CourierPrime', fontSize: 10 },
  entryMoodBadge: { fontFamily: 'CourierPrime', fontSize: 9, borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, letterSpacing: 0.5 },
  entryPhase: { fontFamily: 'CourierPrime', fontSize: 9, flex: 1 },
  deleteBtn: { fontFamily: 'CourierPrime', fontSize: 18, lineHeight: 20 },
  entryBody: { fontFamily: 'CourierPrime', fontSize: 12, lineHeight: 19 },
  privacyNote: { borderTopWidth: 1, paddingTop: 16, marginTop: 8, alignItems: 'center' },
  privacyText: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1, textAlign: 'center', lineHeight: 16 },
});
