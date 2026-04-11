// hooks/useResponsiveHeart.ts
// ─────────────────────────────────────────────────────────────────────────────
// Ghost heartbeat. Derives BPM and breathing rhythm from three signals:
//   1. Circadian phase
//   2. Accelerometer restlessness (from useOrchidSway, via mood log)
//   3. Most recent mood score
//
// BPM range: 45–78.
// Dormant (no mood data): fixed slow ambient rate — present, not urgent.
// Active: mirrors and regulates the user's internal state.
//
// Loop closed: mood logged → moodEvents.emit() → recalculate immediately.
// 5-minute interval is background fallback only.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useRef } from 'react';
import { CircadianPhase } from '@/constants/circadian';
import { Sanctuary } from '@/utils/storage';
import { moodEvents } from '@/utils/mood-event';

export interface HeartBiometrics {
  bpm: number;
  inhaleMs: number;
  holdMs: number;
  exhaleMs: number;
  amplitude: number;
  opacityRange: [number, number];
}

function defaultBiometrics(): HeartBiometrics {
  return {
    bpm: 60,
    inhaleMs: 800,
    holdMs: 200,
    exhaleMs: 800,
    amplitude: 0.08,
    opacityRange: [0.45, 0.95],
  };
}

export function useResponsiveHeart(phase: CircadianPhase) {
  const [biometrics, setBiometrics] = useState<HeartBiometrics>(defaultBiometrics);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const calculate = async () => {
      const logs = await Sanctuary.getMoodLogs(5);

      // ── Dormant — no mood data yet ─────────────────────────────────────────
      // Fixed slow ambient pulse. Present, not urgent.
      // Does not apply silence-concern modifiers — user hasn't started yet.
      if (!logs.length) {
        const dormantBpm = phase === 'night' ? 50 : 56;
        const cycleMs = 60000 / dormantBpm;
        if (!mountedRef.current) return;
        setBiometrics({
          bpm: dormantBpm,
          inhaleMs: cycleMs * 0.4,
          holdMs: cycleMs * 0.1,
          exhaleMs: cycleMs * 0.5,
          amplitude: 0.06,
          opacityRange: [0.45, 0.85],
        });
        return;
      }

      // ── Active — derive from signals ───────────────────────────────────────
      const last = logs[0];
      const hoursSince = (Date.now() - last.ts) / 3_600_000;
      const avgRestlessness = logs.slice(0, 3)
        .reduce((s, l) => s + l.restlessness, 0) / Math.min(logs.length, 3);
      const lastScore = last.moodScore;

      // Base BPM: 50 (crisis) → 75 (grounded), scaled across score 1–10
      let bpm = 50 + (lastScore - 1) * 2.8;

      // Phase modifiers
      if (avgRestlessness > 0.6) bpm += 5;   // anxious → more frequent, smaller
      if (phase === 'night')      bpm -= 10;  // sleep support → deep and slow
      if (phase === 'goldenHour') bpm += 5;   // protective presence → slightly elevated

      // Thriving floor — high score + recent check-in → settle the orb, not celebrate
      if (lastScore >= 8 && hoursSince < 6)   bpm -= 8;

      // Silence concern — gentle urgency when the user goes quiet
      if (hoursSince > 6)  bpm += 8;
      if (hoursSince > 24) bpm += 5;

      bpm = Math.max(45, Math.min(78, bpm));

      const cycleMs = 60000 / bpm;
      let ratios: [number, number, number];
      if (lastScore <= 3)       ratios = [0.3, 0.2, 0.5];
      else if (lastScore >= 8)  ratios = [0.4, 0.1, 0.5];
      else                      ratios = [0.35, 0.15, 0.5];

      const inhaleMs = cycleMs * ratios[0];
      const holdMs   = cycleMs * ratios[1];
      const exhaleMs = cycleMs * ratios[2];
      const amplitude = avgRestlessness > 0.7 ? 0.05 : hoursSince > 12 ? 0.12 : 0.08;
      const opacityRange: [number, number] = lastScore <= 3 ? [0.3, 0.8] : [0.5, 1.0];

      if (!mountedRef.current) return;
      setBiometrics({ bpm, inhaleMs, holdMs, exhaleMs, amplitude, opacityRange });
    };

    calculate();
    const interval = setInterval(calculate, 5 * 60 * 1000);
    const unsub = moodEvents.subscribe(calculate);
    return () => { clearInterval(interval); unsub(); };
  }, [phase]);

  // Human-readable system state for ambient display
  const systemState: string =
    biometrics.bpm < 52 ? 'holding'     :
    biometrics.bpm < 62 ? 'present'     :
    biometrics.bpm < 72 ? 'attuned'     :
    'celebrating';

  return { biometrics, systemState };
}
