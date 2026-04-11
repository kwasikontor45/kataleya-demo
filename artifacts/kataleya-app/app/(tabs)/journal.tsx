import React, { useState, useEffect, useCallback, useRef } from 'react';import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useCircadian } from '@/hooks/useCircadian';
import { useOrchidSway } from '@/hooks/useOrchidSway';
import { TAB_BAR_HEIGHT } from '@/constants/circadian';
import { Sanctuary, MoodLog, JournalEntry } from '@/utils/storage';
import { moodEvents } from '@/utils/mood-event';
import { suppressReminderForToday } from '@/hooks/useNotifications';
import { NeonCard, NEON_RGB } from '@/components/NeonCard';
import { HoldToConfirm } from '@/components/HoldToConfirm';

// ── Mood grid — matches base44 layout ────────────────────────────────────────
const MOOD_GRID = [
  { score: 8,  label: 'Calm',      icon: '≋',  rgb: '127,201,201' },
  { score: 3,  label: 'Anxious',   icon: '↯',  rgb: '220,160,80'  },
  { score: 2,  label: 'Stressed',  icon: '⊗',  rgb: '255,107,107' },
  { score: 6,  label: 'Neutral',   icon: '⊙',  rgb: '160,144,96'  },
  { score: 9,  label: 'Energized', icon: '⊛',  rgb: '74,222,128'  },
  { score: 1,  label: 'Low',       icon: '▽',  rgb: '240,130,100' },
];

const MOOD_PILL_LABELS = [
  { score: 1,  label: 'heavy',    rgb: '255,107,107' },
  { score: 2,  label: 'low',      rgb: '240,130,100' },
  { score: 3,  label: 'uneasy',   rgb: '220,160,80'  },
  { score: 4,  label: 'okay',     rgb: '190,170,80'  },
  { score: 5,  label: 'steady',   rgb: '150,190,120' },
  { score: 6,  label: 'light',    rgb: '127,201,180' },
  { score: 7,  label: 'clear',    rgb: '100,210,160' },
  { score: 8,  label: 'bright',   rgb: '80,220,140'  },
  { score: 9,  label: 'radiant',  rgb: '74,222,128'  },
  { score: 10, label: 'blooming', rgb: '60,220,120'  },
];

// ── Circadian-aware journal prompts — large pool, mood-weighted ───────────────

// Each prompt has a phase, a mood tier (low/mid/high), and the text.
// Low = struggling (score ≤ 4), mid = stable (5–7), high = thriving (8+)
type MoodTier = 'low' | 'mid' | 'high' | 'any';
interface Prompt { phase: string; tier: MoodTier; text: string; }

const PROMPT_POOL: Prompt[] = [
  // ── DAWN ──────────────────────────────────────────────────────────────────
  { phase: 'dawn', tier: 'low',  text: 'What is one small thing I can do to be gentle with myself today?' },
  { phase: 'dawn', tier: 'low',  text: 'What does rest look like for me this morning, even if just for five minutes?' },
  { phase: 'dawn', tier: 'low',  text: 'What would I say to a friend who woke up feeling the way I do right now?' },
  { phase: 'dawn', tier: 'low',  text: 'What do I need most today, and how can I ask for it?' },
  { phase: 'dawn', tier: 'low',  text: 'What am I carrying from yesterday that I can choose to set down?' },
  { phase: 'dawn', tier: 'mid',  text: 'What intention do I want to carry into today?' },
  { phase: 'dawn', tier: 'mid',  text: 'What does a good day look like for me right now?' },
  { phase: 'dawn', tier: 'mid',  text: 'What am I grateful for this morning?' },
  { phase: 'dawn', tier: 'mid',  text: 'What is one thing I am looking forward to today?' },
  { phase: 'dawn', tier: 'mid',  text: 'What would help me feel grounded before the day begins?' },
  { phase: 'dawn', tier: 'mid',  text: 'Who do I want to be today, and what would that look like in practice?' },
  { phase: 'dawn', tier: 'high', text: 'What would I say to myself one year from now?' },
  { phase: 'dawn', tier: 'high', text: 'What is something I am building slowly that deserves acknowledgment?' },
  { phase: 'dawn', tier: 'high', text: 'What has changed in me over the past month that I am proud of?' },
  { phase: 'dawn', tier: 'high', text: 'What does thriving feel like in my body right now?' },
  { phase: 'dawn', tier: 'any',  text: 'If this morning had a color, what would it be and why?' },
  { phase: 'dawn', tier: 'any',  text: 'What does my body need before anything else today?' },
  { phase: 'dawn', tier: 'any',  text: 'What is one truth I know about myself that I want to remember today?' },

  // ── DAY ───────────────────────────────────────────────────────────────────
  { phase: 'day',  tier: 'low',  text: 'What is making today feel heavy, and what is one thing I can release?' },
  { phase: 'day',  tier: 'low',  text: 'What do I need right now that I have not asked for?' },
  { phase: 'day',  tier: 'low',  text: 'What would I tell someone I love if they were having a day like mine?' },
  { phase: 'day',  tier: 'low',  text: 'What is one moment today, however small, where I showed up for myself?' },
  { phase: 'day',  tier: 'low',  text: 'What feeling am I avoiding right now, and what would happen if I let it exist?' },
  { phase: 'day',  tier: 'mid',  text: 'Who helped me today, and how can I show appreciation?' },
  { phase: 'day',  tier: 'mid',  text: 'What is testing my patience right now?' },
  { phase: 'day',  tier: 'mid',  text: 'What moment today felt most like me?' },
  { phase: 'day',  tier: 'mid',  text: 'What do I need to let go of before tonight?' },
  { phase: 'day',  tier: 'mid',  text: 'What did I do today that I am proud of?' },
  { phase: 'day',  tier: 'mid',  text: 'What surprised me today?' },
  { phase: 'day',  tier: 'mid',  text: 'What boundary did I hold today, or wish I had?' },
  { phase: 'day',  tier: 'high', text: 'What is something I am building that I have not told anyone about yet?' },
  { phase: 'day',  tier: 'high', text: 'What does momentum feel like for me right now?' },
  { phase: 'day',  tier: 'high', text: 'What am I most curious about in my own growth?' },
  { phase: 'day',  tier: 'any',  text: 'What is one conversation I keep having with myself that deserves to be written down?' },
  { phase: 'day',  tier: 'any',  text: 'If my recovery had a season right now, what would it be?' },
  { phase: 'day',  tier: 'any',  text: 'What does courage look like for me today?' },

  // ── GOLDEN HOUR ───────────────────────────────────────────────────────────
  { phase: 'goldenHour', tier: 'low',  text: 'What got me through today, even if it was just one breath at a time?' },
  { phase: 'goldenHour', tier: 'low',  text: 'What do I need to feel safe this evening?' },
  { phase: 'goldenHour', tier: 'low',  text: 'What is one kind thing I can do for myself before the night comes?' },
  { phase: 'goldenHour', tier: 'low',  text: 'What would I forgive myself for today if I let myself?' },
  { phase: 'goldenHour', tier: 'low',  text: 'What does my body need to exhale right now?' },
  { phase: 'goldenHour', tier: 'mid',  text: 'How did today compare to what I hoped for?' },
  { phase: 'goldenHour', tier: 'mid',  text: 'What feeling am I carrying into the evening?' },
  { phase: 'goldenHour', tier: 'mid',  text: 'What would I do differently if I had today again?' },
  { phase: 'goldenHour', tier: 'mid',  text: 'What made today worth showing up for?' },
  { phase: 'goldenHour', tier: 'mid',  text: 'Who or what gave me strength today?' },
  { phase: 'goldenHour', tier: 'mid',  text: 'What conversation from today is still sitting with me?' },
  { phase: 'goldenHour', tier: 'high', text: 'What is something good that happened today that I almost let slip by unnoticed?' },
  { phase: 'goldenHour', tier: 'high', text: 'What does this evening feel like compared to one month ago?' },
  { phase: 'goldenHour', tier: 'high', text: 'What am I most looking forward to tomorrow?' },
  { phase: 'goldenHour', tier: 'any',  text: 'If today had a title like a chapter in a book, what would it be?' },
  { phase: 'goldenHour', tier: 'any',  text: 'What is something small I noticed today that felt meaningful?' },
  { phase: 'goldenHour', tier: 'any',  text: 'What do I want to remember about today?' },

  // ── NIGHT ─────────────────────────────────────────────────────────────────
  { phase: 'night', tier: 'low',  text: 'What is weighing on me right now that I can release here?' },
  { phase: 'night', tier: 'low',  text: 'What kept me going today when everything felt like too much?' },
  { phase: 'night', tier: 'low',  text: 'What do I wish someone would say to me right now?' },
  { phase: 'night', tier: 'low',  text: 'What is one thing I survived today that I did not think I could?' },
  { phase: 'night', tier: 'low',  text: 'What does my body need most before sleep?' },
  { phase: 'night', tier: 'low',  text: 'What am I afraid of right now, and what would help me feel less alone with it?' },
  { phase: 'night', tier: 'mid',  text: 'What does rest mean for me tonight?' },
  { phase: 'night', tier: 'mid',  text: 'What do I want tomorrow to feel like?' },
  { phase: 'night', tier: 'mid',  text: 'If this moment could speak, what would it say?' },
  { phase: 'night', tier: 'mid',  text: 'What thought keeps returning tonight, and what does it need?' },
  { phase: 'night', tier: 'mid',  text: 'What am I holding onto that I could put down before sleep?' },
  { phase: 'night', tier: 'high', text: 'What does peace feel like in my life right now compared to before?' },
  { phase: 'night', tier: 'high', text: 'What is something I used to fear that no longer has the same power?' },
  { phase: 'night', tier: 'high', text: 'What does my future self look like, and how close does it feel?' },
  { phase: 'night', tier: 'any',  text: 'What is one thing I want to remember when tomorrow feels hard?' },
  { phase: 'night', tier: 'any',  text: 'What would I write to the version of me from one year ago?' },
  { phase: 'night', tier: 'any',  text: 'What is something true about me that no one else can take away?' },
];

// Mood-weighted prompt picker — reads recent Sanctuary logs
// Low mood → prefers 'low' tier prompts. High mood → prefers 'high'.
// Never repeats the last shown prompt in a session.
async function getWeightedPrompt(
  phase: string,
  lastPrompt: string | null,
): Promise<string> {
  let tier: MoodTier = 'mid';
  try {
    const logs = await Sanctuary.getMoodLogs(10);
    if (logs.length >= 3) {
      const avg = logs.slice(0, 5).reduce((s, l) => s + l.moodScore, 0) / Math.min(logs.length, 5);
      if (avg <= 4) tier = 'low';
      else if (avg >= 7.5) tier = 'high';
      else tier = 'mid';
    }
  } catch { tier = 'mid'; }

  // Filter by phase — prefer exact phase, fall back to 'any'
  const phasePool = PROMPT_POOL.filter(p => p.phase === phase);
  const anyPool   = PROMPT_POOL.filter(p => p.phase === phase && p.tier === 'any');

  // Weighted selection — primary tier gets 3x weight, 'any' always included
  const weighted = [
    ...phasePool.filter(p => p.tier === tier),
    ...phasePool.filter(p => p.tier === tier),
    ...phasePool.filter(p => p.tier === tier),
    ...anyPool,
    ...phasePool.filter(p => p.tier !== tier && p.tier !== 'any'),
  ].filter(p => p.text !== lastPrompt); // never repeat last shown

  if (weighted.length === 0) {
    // Fallback — just pick anything from the phase
    const fallback = phasePool.filter(p => p.text !== lastPrompt);
    return fallback[Math.floor(Math.random() * fallback.length)]?.text ?? phasePool[0].text;
  }

  return weighted[Math.floor(Math.random() * weighted.length)].text;
}

function formatTs(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffH = (now.getTime() - ts) / 3600000;
  if (diffH < 1) return `${Math.floor(diffH * 60)}m ago`;
  if (diffH < 24) return `${Math.floor(diffH)}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function moodRgb(score: number): string {
  const exact = MOOD_PILL_LABELS.find(s => s.score === score);
  if (exact) return exact.rgb;
  return MOOD_PILL_LABELS.reduce((a, b) =>
    Math.abs(b.score - score) < Math.abs(a.score - score) ? b : a
  ).rgb;
}

function moodLabel(score: number): string {
  const grid = MOOD_GRID.find(m => m.score === score);
  if (grid) return grid.label;
  return MOOD_PILL_LABELS.find(s => s.score === score)?.label ?? String(score);
}

function phaseAccentRgb(phase: string): string {
  if (phase === 'goldenHour') return NEON_RGB.amber;
  if (phase === 'night')      return NEON_RGB.violet;
  if (phase === 'dawn')       return NEON_RGB.pink;
  return NEON_RGB.cyan;
}

function KbDismiss({ accentRgb }: { accentRgb: string }) {
  return (
    <TouchableOpacity
      onPress={() => Keyboard.dismiss()}
      hitSlop={12}
      style={[styles.kbBtn, { borderColor: `rgba(${accentRgb},0.3)`, backgroundColor: `rgba(${accentRgb},0.07)` }]}
    >
      <Text style={[styles.kbText, { color: `rgba(${accentRgb},0.7)` }]}>done</Text>
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
  const [moodLogsExpanded, setMoodLogsExpanded] = useState(false);
  const [journalBody, setJournalBody] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [journalExpanded, setJournalExpanded] = useState(false);
  const [journalFocused, setJournalFocused] = useState(false);

  // ── Prompt card state ─────────────────────────────────────────────────────
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [promptVisible, setPromptVisible] = useState(true);
  const lastPromptRef = useRef<string | null>(null);

  const keyboardVisible = moodNoteFocused || journalFocused;

  const loadData = useCallback(async () => {
    const [logs, journal] = await Promise.all([
      Sanctuary.getMoodLogs(),
      Sanctuary.getJournalEntries(),
    ]);
    setMoodLogs(logs);
    setEntries(journal);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleGiveMePrompt = async () => {
    const prompt = await getWeightedPrompt(phase, lastPromptRef.current);
    lastPromptRef.current = prompt;
    setActivePrompt(prompt);
    setPromptVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!journalBody.trim()) setJournalBody('');
  };

  // ── Mood record ───────────────────────────────────────────────────────────
  const handleSaveMood = async () => {
    if (selectedMood === null) return;
    Keyboard.dismiss();
    await Sanctuary.saveMoodLog({
      ts: Date.now(),
      moodScore: selectedMood,
      context: moodNote.trim() || undefined,
      circadianPhase: phase,
      restlessness: restlessnessScore,
    });
    moodEvents.emit(); // orb recalculates immediately
    setSelectedMood(null);
    setMoodNote('');
    suppressReminderForToday();
    await loadData();
  };

  // ── Journal seal ──────────────────────────────────────────────────────────
  const handleSaveEntry = async () => {
    if (!journalBody.trim()) return;
    Keyboard.dismiss();
    await Sanctuary.saveJournalEntry({
      ts: Date.now(),
      body: journalBody.trim(),
      moodScore: selectedMood ?? undefined,
      circadianPhase: phase,
    });
    setJournalBody('');
    setActivePrompt(null);
    await loadData();
  };

  const handleDeleteEntry = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Sanctuary.deleteJournalEntry(id).then(loadData);
  };

  const visibleLogs    = moodLogsExpanded ? moodLogs : moodLogs.slice(0, 5);
  const visibleEntries = journalExpanded  ? entries  : entries.slice(0, 3);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 16 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => Keyboard.dismiss()}
        >

          {/* ── Journal header ── */}
          <View style={styles.journalHeader}>
            <View>
              <Text style={[styles.journalTitle, { color: theme.text }]}>Journal</Text>
              <Text style={[styles.journalSubtitle, { color: `rgba(${NEON_RGB.cyan},0.7)` }]}>
                ◎ Private &amp; encrypted
              </Text>
            </View>
          </View>

          {/* ── Prompt card ── */}
          {promptVisible && (
            <NeonCard theme={theme} accentRgb={NEON_RGB.violet} style={styles.card}>
              <View style={styles.promptRow}>
                <View style={styles.promptLeft}>
                  <Text style={[styles.promptIcon, { color: `rgba(${NEON_RGB.violet},0.8)` }]}>✦</Text>
                  {activePrompt ? (
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.promptText, { color: theme.text }]} numberOfLines={3}>
                        "{activePrompt}"
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.promptTitle, { color: theme.text }]}>Need a prompt?</Text>
                      <Text style={[styles.promptHint, { color: `${theme.textMuted}99` }]}>
                        Let a reflection question guide your writing
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.promptActions}>
                  <TouchableOpacity onPress={handleGiveMePrompt}>
                    <Text style={[styles.giveMeOne, { color: `rgba(${NEON_RGB.violet},0.9)` }]}>
                      {activePrompt ? 'new one' : 'give me one'}
                    </Text>
                  </TouchableOpacity>
                  {activePrompt && (
                    <TouchableOpacity onPress={() => setActivePrompt(null)} hitSlop={8}>
                      <Text style={[styles.promptDismiss, { color: `rgba(${NEON_RGB.violet},0.35)` }]}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </NeonCard>
          )}

          {/* ── Mood section ── */}
          <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)` }]}>
            how are you feeling?
          </Text>

          <NeonCard theme={theme} accentRgb={accentRgb} style={styles.card}>
            <View style={styles.cardInner}>

              {/* Mood grid — 3 columns × 2 rows like base44 */}
              <View style={styles.moodGrid}>
                {MOOD_GRID.map(m => {
                  const sel = selectedMood === m.score;
                  return (
                    <TouchableOpacity
                      key={m.score}
                      style={[
                        styles.moodGridBtn,
                        {
                          borderColor: `rgba(${m.rgb},${sel ? 0.75 : 0.18})`,
                          borderTopColor: `rgba(${m.rgb},${sel ? 1 : 0.32})`,
                          borderTopWidth: 1.5,
                          backgroundColor: sel
                            ? `rgba(${m.rgb},0.16)`
                            : `rgba(${m.rgb},0.05)`,
                          shadowColor: `rgb(${m.rgb})`,
                          shadowOffset: { width: 0, height: sel ? 4 : 1 },
                          shadowOpacity: sel ? 0.35 : 0.08,
                          shadowRadius: sel ? 8 : 3,
                          elevation: sel ? 4 : 1,
                        },
                      ]}
                      onPress={() => {
                        setSelectedMood(sel ? null : m.score);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text style={[styles.moodGridIcon, { color: `rgba(${m.rgb},${sel ? 1 : 0.65})` }]}>
                        {m.icon}
                      </Text>
                      <Text style={[
                        styles.moodGridLabel,
                        { color: `rgba(${m.rgb},${sel ? 1 : 0.6})` },
                      ]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Restlessness bar */}
              {restlessnessScore > 0.45 && (
                <View style={styles.restlessRow}>
                  <View style={[styles.restlessTrack, { backgroundColor: `rgba(${accentRgb},0.1)` }]}>
                    <View style={[styles.restlessFill, {
                      width: `${Math.round(restlessnessScore * 100)}%`,
                      backgroundColor: `rgba(${accentRgb},0.5)`,
                    }]} />
                  </View>
                  <Text style={[styles.restlessLabel, { color: `rgba(${accentRgb},0.4)` }]}>restless</Text>
                </View>
              )}

              <TextInput
                value={moodNote}
                onChangeText={setMoodNote}
                onFocus={() => setMoodNoteFocused(true)}
                onBlur={() => setMoodNoteFocused(false)}
                placeholder="a note, if you want one..."
                placeholderTextColor={`rgba(${accentRgb},0.25)`}
                multiline
                maxLength={280}
                style={[
                  styles.noteInput,
                  {
                    color: theme.text,
                    borderColor: `rgba(${accentRgb},${moodNoteFocused ? 0.4 : 0.12})`,
                    backgroundColor: `rgba(${accentRgb},0.04)`,
                  },
                ]}
              />

              {moodNoteFocused && (
                <View style={styles.noteActions}>
                  <Text style={[styles.charHint, { color: `rgba(${accentRgb},0.35)` }]}>{moodNote.length} / 280</Text>
                  <KbDismiss accentRgb={accentRgb} />
                </View>
              )}

              <HoldToConfirm
                label={selectedMood !== null ? `record · ${moodLabel(selectedMood)}` : 'select a mood above'}
                holdingLabel={selectedMood !== null ? `recording · ${moodLabel(selectedMood)}` : 'select a mood above'}
                accentRgb={selectedMood !== null ? moodRgb(selectedMood) : accentRgb}
                duration={900}
                disabled={selectedMood === null}
                onConfirm={handleSaveMood}
              />
            </View>
          </NeonCard>

          {/* Mood log history */}
          {moodLogs.length > 0 && (
            <NeonCard theme={theme} accentRgb={accentRgb} fillIntensity={0.03} borderIntensity={0.1}>
              {visibleLogs.map((log, i) => (
                <View
                  key={log.id}
                  style={[
                    styles.logRow,
                    i < visibleLogs.length - 1 && { borderBottomWidth: 1, borderBottomColor: `rgba(${accentRgb},0.08)` },
                  ]}
                >
                  <View style={[styles.moodBadge, { backgroundColor: `rgba(${moodRgb(log.moodScore)},0.15)`, borderColor: `rgba(${moodRgb(log.moodScore)},0.4)` }]}>
                    <Text style={[styles.moodBadgeIcon]}>
                      {MOOD_GRID.find(m => m.score === log.moodScore)?.icon ?? '·'}
                    </Text>
                    <Text style={[styles.moodBadgeLabel, { color: `rgba(${moodRgb(log.moodScore)},0.95)` }]}>
                      {moodLabel(log.moodScore)}
                    </Text>
                  </View>
                  <Text style={[styles.logTime, { color: `${theme.textMuted}55` }]}>{formatTs(log.ts)}</Text>
                  {log.context ? (
                    <Text style={[styles.logNote, { color: `${theme.textMuted}70` }]} numberOfLines={2}>
                      {log.context}
                    </Text>
                  ) : null}
                </View>
              ))}
              {moodLogs.length > 5 && (
                <TouchableOpacity
                  style={[styles.expandBtn, { borderTopColor: `rgba(${accentRgb},0.1)` }]}
                  onPress={() => setMoodLogsExpanded(e => !e)}
                >
                  <Text style={[styles.expandText, { color: `rgba(${accentRgb},0.5)` }]}>
                    {moodLogsExpanded ? '↑ show less' : `↓ ${moodLogs.length - 5} more`}
                  </Text>
                </TouchableOpacity>
              )}
            </NeonCard>
          )}

          {/* ── Journal section ── */}
          <Text style={[styles.sectionLabel, { color: `rgba(${NEON_RGB.violet},0.5)`, marginTop: 24 }]}>
            private journal
          </Text>

          <NeonCard theme={theme} glowColor="violet" style={styles.card}>
            <View style={styles.cardInner}>

              <TextInput
                value={journalBody}
                onChangeText={setJournalBody}
                onFocus={() => setJournalFocused(true)}
                onBlur={() => setJournalFocused(false)}
                placeholder="Write freely. No one can read this but you..."
                placeholderTextColor={`rgba(${NEON_RGB.violet},0.25)`}
                multiline
                maxLength={4000}
                style={[
                  styles.journalInput,
                  {
                    color: theme.text,
                    borderColor: `rgba(${NEON_RGB.violet},${journalFocused ? 0.4 : 0.12})`,
                    backgroundColor: `rgba(${NEON_RGB.violet},0.04)`,
                  },
                ]}
                textAlignVertical="top"
              />

              <View style={styles.journalFooter}>
                <Text style={[styles.charCount, { color: `rgba(${NEON_RGB.violet},0.35)` }]}>
                  {journalBody.length} / 4000
                </Text>
                {keyboardVisible && <KbDismiss accentRgb={NEON_RGB.violet} />}
              </View>

              <HoldToConfirm
                label="Save entry"
                holdingLabel="saving..."
                accentRgb={NEON_RGB.violet}
                duration={1000}
                disabled={!journalBody.trim()}
                onConfirm={handleSaveEntry}
              />
            </View>
          </NeonCard>

          {/* Journal entry history */}
          {entries.length === 0 ? (
            <View style={[styles.emptyCard, { borderColor: `rgba(${NEON_RGB.violet},0.1)` }]}>
              <Text style={[styles.emptyText, { color: `${theme.textMuted}55` }]}>
                Your journal is empty.{'\n'}Start writing your first entry.
              </Text>
            </View>
          ) : (
            <NeonCard theme={theme} glowColor="violet" fillIntensity={0.03} borderIntensity={0.1}>
              {visibleEntries.map((entry, i) => (
                <View
                  key={entry.id}
                  style={[
                    styles.entryRow,
                    i < visibleEntries.length - 1 && { borderBottomWidth: 1, borderBottomColor: `rgba(${NEON_RGB.violet},0.08)` },
                  ]}
                >
                  {/* Entry header — mood badge + timestamp + delete */}
                  <View style={styles.entryMeta}>
                    {entry.moodScore != null && (
                      <View style={[styles.moodBadge, {
                        backgroundColor: `rgba(${moodRgb(entry.moodScore)},0.15)`,
                        borderColor: `rgba(${moodRgb(entry.moodScore)},0.4)`,
                      }]}>
                        <Text style={styles.moodBadgeIcon}>
                          {MOOD_GRID.find(m => m.score === entry.moodScore)?.icon ?? '·'}
                        </Text>
                        <Text style={[styles.moodBadgeLabel, { color: `rgba(${moodRgb(entry.moodScore)},0.95)` }]}>
                          {moodLabel(entry.moodScore)}
                        </Text>
                      </View>
                    )}
                    <Text style={[styles.entryTime, { color: `${theme.textMuted}65` }]}>{formatTs(entry.ts)}</Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteEntry(entry.id)}
                      hitSlop={8}
                      style={styles.deleteTouch}
                    >
                      <Text style={[styles.deleteBtn, { color: `rgba(255,100,100,0.5)` }]}>✕ Delete entry</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.entryBody, { color: `${theme.text}cc` }]} numberOfLines={journalExpanded ? undefined : 4}>
                    {entry.body}
                  </Text>
                </View>
              ))}
              {entries.length > 3 && (
                <TouchableOpacity
                  style={[styles.expandBtn, { borderTopColor: `rgba(${NEON_RGB.violet},0.1)` }]}
                  onPress={() => setJournalExpanded(e => !e)}
                >
                  <Text style={[styles.expandText, { color: `rgba(${NEON_RGB.violet},0.5)` }]}>
                    {journalExpanded ? '↑ show less' : `↓ ${entries.length - 3} more entries`}
                  </Text>
                </TouchableOpacity>
              )}
            </NeonCard>
          )}

          <View style={[styles.privacyNote, { borderColor: `rgba(${accentRgb},0.1)` }]}>
            <Text style={[styles.privacyText, { color: `${theme.textMuted}45` }]}>
              Sanctuary · stored locally · never leaves this device
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 8 },

  // ── Header ──
  journalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  journalTitle: {
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'CourierPrime',
    letterSpacing: -0.5,
  },
  journalSubtitle: {
    fontFamily: 'CourierPrime',
    fontSize: 12,
    marginTop: 2,
  },

  // ── Prompt card ──
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  promptLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  promptIcon: { fontSize: 18, marginTop: 1 },
  promptTitle: { fontFamily: 'CourierPrime', fontSize: 14, fontWeight: '600' },
  promptText: { fontFamily: 'CourierPrime', fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  promptHint: { fontFamily: 'CourierPrime', fontSize: 11, marginTop: 3 },
  promptActions: { alignItems: 'flex-end', gap: 8 },
  giveMeOne: { fontFamily: 'CourierPrime', fontSize: 13, fontWeight: '600' },
  promptDismiss: { fontFamily: 'CourierPrime', fontSize: 16, lineHeight: 18 },

  // ── Section label ──
  sectionLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 4,
    marginTop: 8,
  },

  card: { width: '100%' },
  cardInner: { padding: 16, gap: 12 },
  hint: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 0.5, lineHeight: 15 },

  // ── Mood grid ──
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodGridBtn: {
    width: '30.5%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
  },
  moodGridIcon: { fontSize: 26, lineHeight: 30 },
  moodGridLabel: { fontFamily: 'CourierPrime', fontSize: 12, letterSpacing: 0.3 },

  // ── Mood badge (log + entry) ──
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  moodBadgeIcon: { fontSize: 14 },
  moodBadgeLabel: { fontFamily: 'CourierPrime', fontSize: 11, fontWeight: '600' },

  // ── Restlessness ──
  restlessRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  restlessTrack: { flex: 1, height: 2, borderRadius: 1, overflow: 'hidden' },
  restlessFill: { height: '100%', borderRadius: 1 },
  restlessLabel: { fontFamily: 'CourierPrime', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' },

  // ── Note input ──
  noteInput: {
    fontFamily: 'CourierPrime',
    fontSize: 12,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 56,
    lineHeight: 18,
  },
  noteActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  charHint: { fontFamily: 'CourierPrime', fontSize: 10 },

  // ── Log row ──
  logRow: { paddingVertical: 11, paddingHorizontal: 14, gap: 6 },
  logTime: { fontFamily: 'CourierPrime', fontSize: 10 },
  logNote: { fontFamily: 'CourierPrime', fontSize: 10, lineHeight: 15 },

  // ── Expand ──
  expandBtn: { borderTopWidth: 1, paddingVertical: 11, alignItems: 'center' },
  expandText: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1 },

  // ── Empty ──
  emptyCard: { borderWidth: 1, borderRadius: 12 },
  emptyText: { fontFamily: 'CourierPrime', fontSize: 12, lineHeight: 19, textAlign: 'center', padding: 20 },

  // ── Journal input ──
  journalInput: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    lineHeight: 20,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 140,
  },
  journalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  charCount: { fontFamily: 'CourierPrime', fontSize: 10, flex: 1 },
  kbBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 14 },
  kbText: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 1.5 },

  // ── Entry row ──
  entryRow: { padding: 14, gap: 8 },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  entryTime: { fontFamily: 'CourierPrime', fontSize: 10, flex: 1 },
  deleteTouch: { marginLeft: 'auto' },
  deleteBtn: { fontFamily: 'CourierPrime', fontSize: 11 },
  entryBody: { fontFamily: 'CourierPrime', fontSize: 12, lineHeight: 19 },

  // ── Privacy note ──
  privacyNote: { borderTopWidth: 1, paddingTop: 16, marginTop: 8, alignItems: 'center' },
  privacyText: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1, textAlign: 'center', lineHeight: 16 },
});
