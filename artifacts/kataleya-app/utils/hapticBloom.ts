/**
 * hapticBloom.ts — Orchid haptic bloom profiles + sponsor presence patterns.
 *
 * All functions are fire-and-forget with silent error swallowing so a haptic
 * failure never interrupts app logic. setTimeout chains provide precise timing
 * without blocking the JS thread.
 *
 * Bloom stages map to orchid growth thresholds in OrchidProgress.tsx:
 *   Seed      → Day 0   — no haptic (potential, waiting)
 *   Budding   → Day 1   — light impact (beginning)
 *   Parting   → Day 7   — two gentle taps (unfolding, leaf appears)
 *   Labellum  → Day 30  — medium + soft follow (opening, second bloom)
 *   Full Bloom → Day 90 — triple success (achievement)
 *
 * Sponsor presence patterns:
 *   Water → 3 expanding ripple taps (cool presence)
 *   Light → lub-dub heartbeat at 72 BPM (warm presence, perceptible through fabric)
 */

import * as Haptics from 'expo-haptics';

const { ImpactFeedbackStyle, NotificationFeedbackType } = Haptics;

const safe = (fn: () => Promise<void>) => fn().catch(() => {});
const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// ── Orchid Bloom Profiles ────────────────────────────────────────────────────

/** Seed — potential, waiting. No haptic. */
export function bloomSeed() {
  // Intentionally silent — the absence of feedback is itself meaningful.
}

/** Budding — beginning. Single light tap. */
export function bloomBudding() {
  safe(() => Haptics.impactAsync(ImpactFeedbackStyle.Light));
}

/** Parting — unfolding. Two gentle taps 180ms apart. */
export function bloomParting() {
  safe(() => Haptics.impactAsync(ImpactFeedbackStyle.Light));
  setTimeout(() => safe(() => Haptics.impactAsync(ImpactFeedbackStyle.Light)), 180);
}

/**
 * Labellum — opening.
 * Medium grounding impact followed by a soft light echo.
 */
export function bloomLabellum() {
  safe(() => Haptics.impactAsync(ImpactFeedbackStyle.Medium));
  setTimeout(() => safe(() => Haptics.impactAsync(ImpactFeedbackStyle.Light)), 120);
}

/**
 * Full Bloom — achievement.
 * Three success pulses in quick succession — the orchid has fully opened.
 */
export function bloomFullBloom() {
  safe(() => Haptics.notificationAsync(NotificationFeedbackType.Success));
  setTimeout(() => safe(() => Haptics.notificationAsync(NotificationFeedbackType.Success)), 130);
  setTimeout(() => safe(() => Haptics.notificationAsync(NotificationFeedbackType.Success)), 260);
}

// ── Sponsor Presence Profiles ────────────────────────────────────────────────

/**
 * Sponsor Water — cool presence.
 * Three expanding ripple taps. Gaps widen (100ms → 200ms) to suggest
 * a drop hitting still water and expanding outward.
 */
export function sponsorWater() {
  safe(() => Haptics.impactAsync(ImpactFeedbackStyle.Light));
  setTimeout(() => safe(() => Haptics.impactAsync(ImpactFeedbackStyle.Light)), 100);
  setTimeout(() => safe(() => Haptics.impactAsync(ImpactFeedbackStyle.Light)), 300);
}

/**
 * Sponsor Light — warm presence.
 * Lub-dub heartbeat pattern at 72 BPM. Perceptible through fabric.
 *
 * Timing: Medium → 100ms → Light → 280ms → Medium → 100ms → Light → silence
 *          ↑ lub         ↑ dub   ↑ pause   ↑ lub         ↑ dub
 *
 * Two complete cardiac cycles, then silence — presence felt, not intrusive.
 */
export function sponsorLight() {
  safe(() => Haptics.impactAsync(ImpactFeedbackStyle.Medium));         // lub  (t = 0)
  setTimeout(() => safe(() => Haptics.impactAsync(ImpactFeedbackStyle.Light)),   100); // dub  (t = 100)
  setTimeout(() => safe(() => Haptics.impactAsync(ImpactFeedbackStyle.Medium)),  380); // lub  (t = 380)
  setTimeout(() => safe(() => Haptics.impactAsync(ImpactFeedbackStyle.Light)),   480); // dub  (t = 480) → fade
}

// ── Stage threshold table ────────────────────────────────────────────────────
// Ordered ascending. The sanctuary screen watches daysSober and fires the
// profile exactly once the first time each threshold is crossed.

export interface BloomThreshold {
  days: number;
  stage: string;
  fire: () => void;
}

export const BLOOM_THRESHOLDS: BloomThreshold[] = [
  { days: 1,  stage: 'budding',   fire: bloomBudding   },
  { days: 7,  stage: 'parting',   fire: bloomParting   },
  { days: 30, stage: 'labellum',  fire: bloomLabellum  },
  { days: 90, stage: 'fullBloom', fire: bloomFullBloom },
];
