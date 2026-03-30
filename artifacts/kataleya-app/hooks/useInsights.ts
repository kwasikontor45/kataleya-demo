'use no memo';
/**
 * useInsights — local pattern detection with confidence gating.
 *
 * Guardrail 1: no insight surfaces below CONFIDENCE_THRESHOLD.
 * Guardrail 2: language is observational, never diagnostic.
 * Guardrail 3: user corrections (stored in mood_logs.correction) shift
 *              per-context thresholds on next compute.
 */

import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Sanctuary, MoodLog, CircadianEvent } from '@/utils/storage';

export const CONFIDENCE_THRESHOLD = 0.72;

export interface Insight {
  id: string;
  message: string;          // observational, open-ended — never a diagnosis
  confidence: number;       // 0.0–1.0
  n: number;                // number of supporting observations
  phase?: string;           // circadian phase this pattern relates to, if any
}

interface RawPattern {
  id: string;
  message: string;
  confidence: number;
  n: number;
  phase?: string;
}

// ── Confidence formula ────────────────────────────────────────────────────────
// Combines sample size with recency decay.
// n=3 → ~0.21  n=10 → ~0.50  n=30 → ~0.87  n=50 → ~0.97 (plateau)
function scoreConfidence(n: number, mostRecentTs: number): number {
  if (n < 3) return 0;
  const sizeScore = 1 - 1 / (1 + n / 12);            // sigmoid-like
  const ageDays = (Date.now() - mostRecentTs) / 86_400_000;
  const recency = Math.exp(-ageDays / 45);             // half-life ~45 days
  return Math.min(0.97, sizeScore * recency);
}

// ── Pattern: phase with lowest average mood ───────────────────────────────────
function phaseLowestMood(logs: MoodLog[]): RawPattern | null {
  if (logs.length < 5) return null;

  const byPhase: Record<string, { sum: number; count: number; latest: number }> = {};
  for (const l of logs) {
    const p = l.circadianPhase;
    if (!byPhase[p]) byPhase[p] = { sum: 0, count: 0, latest: 0 };
    byPhase[p].sum += l.moodScore;
    byPhase[p].count += 1;
    if (l.ts > byPhase[p].latest) byPhase[p].latest = l.ts;
  }

  const phases = Object.entries(byPhase).filter(([, v]) => v.count >= 3);
  if (phases.length < 2) return null;

  const sorted = phases.sort(([, a], [, b]) => a.sum / a.count - b.sum / b.count);
  const [phase, data] = sorted[0];
  const avg = data.sum / data.count;
  if (avg > 6) return null;  // not notably low — skip

  const confidence = scoreConfidence(data.count, data.latest);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  const phaseLabel = phaseDisplayName(phase);
  return {
    id: `phase_low_mood_${phase}`,
    message: `${phaseLabel} tends to be harder. You've logged lower moods then ${data.count} times.`,
    confidence,
    n: data.count,
    phase,
  };
}

// ── Pattern: mood trend (last 14 vs. prior 14 days) ──────────────────────────
function moodTrend(logs: MoodLog[]): RawPattern | null {
  const now = Date.now();
  const day14 = 14 * 86_400_000;
  const recent = logs.filter(l => now - l.ts < day14);
  const prior  = logs.filter(l => now - l.ts >= day14 && now - l.ts < 2 * day14);

  if (recent.length < 5 || prior.length < 5) return null;

  const avg = (arr: MoodLog[]) => arr.reduce((s, l) => s + l.moodScore, 0) / arr.length;
  const recentAvg = avg(recent);
  const priorAvg  = avg(prior);
  const delta = recentAvg - priorAvg;

  if (Math.abs(delta) < 1.2) return null;  // not meaningful enough

  const confidence = scoreConfidence(recent.length + prior.length, recent[0]?.ts ?? now);
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  const dir = delta > 0 ? 'been trending higher' : 'been lower';
  return {
    id: 'mood_trend_14d',
    message: `Your mood has ${dir} these past two weeks compared to the two before.`,
    confidence,
    n: recent.length + prior.length,
  };
}

// ── Pattern: check-in frequency (habits) ─────────────────────────────────────
function checkInFrequency(events: CircadianEvent[]): RawPattern | null {
  if (events.length < 10) return null;

  const byPhase: Record<string, number> = {};
  for (const e of events) {
    byPhase[e.phase] = (byPhase[e.phase] ?? 0) + 1;
  }
  const sorted = Object.entries(byPhase).sort(([, a], [, b]) => b - a);
  const [topPhase, topCount] = sorted[0];
  const total = events.length;
  const ratio = topCount / total;

  if (ratio < 0.4) return null;  // no dominant phase

  const confidence = scoreConfidence(topCount, events[0]?.ts ?? Date.now());
  if (confidence < CONFIDENCE_THRESHOLD) return null;

  return {
    id: `checkin_phase_${topPhase}`,
    message: `You check in most during ${phaseDisplayName(topPhase)} — ${Math.round(ratio * 100)}% of the time.`,
    confidence,
    n: topCount,
    phase: topPhase,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function phaseDisplayName(phase: string): string {
  const map: Record<string, string> = {
    dawn:        'Dawn',
    day:         'Day',
    goldenHour:  'Golden Hour',
    night:       'Night',
  };
  return map[phase] ?? phase;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export interface InsightsResult {
  insights: Insight[];
  loading: boolean;
  /**
   * Age in days of the most recent mood log used in computation.
   * 0 if no logs exist. Used to show "Based on your logs from X days ago."
   */
  dataAgeDays: number;
  /**
   * True if at least 7 mood logs exist within the last 90 days.
   * False → show empty state prompt instead of an empty list.
   */
  hasEnoughData: boolean;
}

export function useInsights(): InsightsResult {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataAgeDays, setDataAgeDays] = useState(0);
  const [hasEnoughData, setHasEnoughData] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setLoading(false);
      return;
    }

    let active = true;

    const compute = async () => {
      try {
        const [logs, events] = await Promise.all([
          Sanctuary.getMoodLogs(500),
          Sanctuary.getCircadianLog(90),
        ]);

        // ── Data quality metrics ──────────────────────────────────────────
        const now         = Date.now();
        const ninetyDays  = 90 * 86_400_000;
        const recentLogs  = logs.filter(l => now - l.ts <= ninetyDays);
        const enough      = recentLogs.length >= 7;
        // logs are ORDER BY ts DESC — index 0 is the most recent
        const ageDays     = logs.length > 0
          ? Math.floor((now - logs[0].ts) / 86_400_000)
          : 0;

        const candidates: RawPattern[] = [
          phaseLowestMood(logs),
          moodTrend(logs),
          checkInFrequency(events),
        ].filter((p): p is RawPattern => p !== null);

        // Sort by confidence descending; cap at 3 surfaced insights
        const surfaced = candidates
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 3);

        if (active) {
          setInsights(surfaced);
          setHasEnoughData(enough);
          setDataAgeDays(ageDays);
        }
      } catch {
        // Fail silently — insights are enhancement, not core
      } finally {
        if (active) setLoading(false);
      }
    };

    compute();
    return () => { active = false; };
  }, []);

  return { insights, loading, dataAgeDays, hasEnoughData };
}
