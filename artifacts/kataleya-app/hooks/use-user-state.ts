// hooks/use-user-state.ts
// ─────────────────────────────────────────────────────────────────────────────
// The adaptive state engine. The soul of the experience.
//
// Reads three signal types from local vaults — body, mind, soul —
// and outputs one of four states that drives how the home screen feels.
//
// States:
//   struggling — mood low, urge active, or void phase + no recent breathing
//   stable     — default, no strong signals either way
//   thriving   — mood high, streak active, breathing done today
//   rest       — void phase after 22:00, minimal UI
//
// Zero network calls. Zero data transmitted. Fully local.
// Recalculates on mount and when phase changes.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { Sanctuary } from '@/utils/storage';

export type UserState = 'struggling' | 'stable' | 'thriving' | 'rest';

export interface UserStateResult {
  state: UserState;
  // Signal breakdown — for debugging and future UI adaptation
  signals: {
    avgMood: number | null;        // average of last 5 mood logs
    phaseMood: number | null;      // average mood in current phase
    daysSober: number;
    isVoidPhase: boolean;          // night phase
    isLateNight: boolean;          // after 22:00
    recentJournal: boolean;        // journal entry in last 24h
    moodTrending: 'up' | 'down' | 'flat' | null; // direction of last 3 logs
  };
  loading: boolean;
}

const STRUGGLING_MOOD_THRESHOLD = 4.0;   // avg mood ≤ this = struggling
const THRIVING_MOOD_THRESHOLD   = 7.0;   // avg mood ≥ this = thriving candidate
const THRIVING_DAYS_MIN         = 3;     // min days sober to show thriving
const REST_HOUR                 = 22;    // after 22:00 in void = rest
const RECENT_HOURS              = 24;    // journal recency window

function getMoodTrend(logs: { moodScore: number }[]): 'up' | 'down' | 'flat' | null {
  if (logs.length < 3) return null;
  const recent = logs.slice(0, 3);
  const oldest = recent[recent.length - 1].moodScore;
  const newest = recent[0].moodScore;
  const delta = newest - oldest;
  if (delta > 0.8)  return 'up';
  if (delta < -0.8) return 'down';
  return 'flat';
}

export function useUserState(
  phase: string,
  daysSober: number,
): UserStateResult {
  const [state, setState] = useState<UserState>('stable');
  const [signals, setSignals] = useState<UserStateResult['signals']>({
    avgMood: null,
    phaseMood: null,
    daysSober: 0,
    isVoidPhase: false,
    isLateNight: false,
    recentJournal: false,
    moodTrending: null,
  });
  const [loading, setLoading] = useState(true);

  const evaluate = useCallback(async () => {
    try {
      const now = new Date();
      const hour = now.getHours();
      const isVoidPhase = phase === 'night';
      const isLateNight = hour >= REST_HOUR || hour < 5;

      // ── Read signals ───────────────────────────────────────────────────────
      const [logs, entries] = await Promise.all([
        Sanctuary.getMoodLogs(10),
        Sanctuary.getJournalEntries(5),
      ]);

      // Average mood across last 5 logs
      const recentLogs = logs.slice(0, 5);
      const avgMood = recentLogs.length > 0
        ? recentLogs.reduce((s, l) => s + l.moodScore, 0) / recentLogs.length
        : null;

      // Phase-specific mood average
      const phaseLogs = logs.filter(l => l.circadianPhase === phase).slice(0, 5);
      const phaseMood = phaseLogs.length >= 2
        ? phaseLogs.reduce((s, l) => s + l.moodScore, 0) / phaseLogs.length
        : null;

      // Journal recency
      const recentJournal = entries.length > 0
        && (now.getTime() - entries[0].ts) < RECENT_HOURS * 3600000;

      // Mood trend
      const moodTrending = getMoodTrend(logs);

      const computedSignals: UserStateResult['signals'] = {
        avgMood,
        phaseMood,
        daysSober,
        isVoidPhase,
        isLateNight,
        recentJournal,
        moodTrending,
      };

      // ── Determine state ────────────────────────────────────────────────────

      // REST — void phase late at night, low engagement needed
      if (isVoidPhase && isLateNight) {
        setState('rest');
        setSignals(computedSignals);
        setLoading(false);
        return;
      }

      // STRUGGLING — mood is low, or trending down hard in current phase
      const moodLow = avgMood !== null && avgMood <= STRUGGLING_MOOD_THRESHOLD;
      const phaseMoodLow = phaseMood !== null && phaseMood <= STRUGGLING_MOOD_THRESHOLD;
      const trendingDown = moodTrending === 'down' && (avgMood ?? 10) <= 5.5;

      if (moodLow || phaseMoodLow || trendingDown) {
        setState('struggling');
        setSignals(computedSignals);
        setLoading(false);
        return;
      }

      // THRIVING — mood high, sober long enough, trending up or flat
      const moodHigh = avgMood !== null && avgMood >= THRIVING_MOOD_THRESHOLD;
      const soberEnough = daysSober >= THRIVING_DAYS_MIN;
      const notTrendingDown = moodTrending !== 'down';

      if (moodHigh && soberEnough && notTrendingDown) {
        setState('thriving');
        setSignals(computedSignals);
        setLoading(false);
        return;
      }

      // STABLE — everything else
      setState('stable');
      setSignals(computedSignals);
      setLoading(false);

    } catch {
      // Fail silently — default to stable
      setState('stable');
      setLoading(false);
    }
  }, [phase, daysSober]);

  useEffect(() => {
    setLoading(true);
    evaluate();
  }, [evaluate]);

  return { state, signals, loading };
}

// ── State metadata — drives UI responses ──────────────────────────────────────
export const STATE_CONFIG = {
  struggling: {
    orbPulseSpeed:  6000,   // slower, heavier
    orbOpacity:     0.55,   // dimmer
    bgIntensity:    0.02,   // barely there
    greeting: [
      'the garden rests.',
      'even winter has a purpose.',
      'this too is part of it.',
      'nothing is required of you\nright now.',
    ],
  },
  stable: {
    orbPulseSpeed:  4200,   // normal
    orbOpacity:     0.75,
    bgIntensity:    0.04,
    greeting: [
      'good morning.',
      'good afternoon.',
      'good evening.',
      'good night.',
    ],
  },
  thriving: {
    orbPulseSpeed:  3000,   // alive, energetic
    orbOpacity:     0.95,
    bgIntensity:    0.07,   // warmer, fuller
    greeting: [
      'the garden grows.',
      'something is blooming.',
      'look how far the roots go.',
      'this is what becoming looks like.',
    ],
  },
  rest: {
    orbPulseSpeed:  8000,   // slowest — deep breath
    orbOpacity:     0.35,   // very dim
    bgIntensity:    0.01,   // almost nothing
    greeting: [
      'the garden sleeps.',
      'rest is not surrender.',
      "the garden doesn't judge the winter.",
      '2am always ends.',
    ],
  },
} as const;

// Get phase-appropriate greeting from state config
export function getStateGreeting(
  state: UserState,
  phase: string,
  userName: string | null,
): string {
  const pool = STATE_CONFIG[state].greeting;
  const base = pool[Math.floor(Math.random() * pool.length)];
  if (!userName) return base;
  // For stable/thriving, personalise with name occasionally
  if ((state === 'stable' || state === 'thriving') && Math.random() > 0.5) {
    return `${base.split('\n')[0]}, ${userName.toLowerCase()}.`;
  }
  return base;
}
