/**
 * Storage vaults — three-tier architecture:
 *
 *  Surface  (AsyncStorage)  — UI preferences, sobriety date, onboarding state.
 *                             Nothing sensitive. Never re-classified.
 *  Sanctuary (SQLite)       — Mood logs, journal entries, circadian event log.
 *                             Local-only. Structured for offline insights.
 *  Fortress  (SecureStore)  — Sponsor channel credentials.
 *                             Encrypted at rest, OS keychain-backed.
 *
 * Web fallback: SecureStore → AsyncStorage (dev/preview only, never shipped).
 * Web fallback: SQLite      → AsyncStorage (dev/preview only, never shipped).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// ── Canonical Surface keys ───────────────────────────────────────────────────
const SK = {
  SOBRIETY_START: 'kataleya.surface.sobriety_start',
  ONBOARDED:      'kataleya.surface.onboarded',
  NAME:           'kataleya.surface.name',
  SUBSTANCE:      'kataleya.surface.substance',
  // Tombstone written immediately before burnAll(). If the app crashes mid-wipe,
  // next launch detects this key and completes the burn. Gets erased by clearAll().
  BURN_LOG:         'kataleya.surface.burn_log',
  // Offline check-in queue: written on network failure, replayed on reconnect.
  PENDING_CHECKIN:  'kataleya.surface.pending_checkin',
  // Notification preferences
  NOTIF_ENABLED:          'kataleya.surface.notif_enabled',
  NOTIF_REMINDER_TIME:    'kataleya.surface.notif_reminder_time',  // 'HH:MM'
  LAST_NOTIFIED_MILESTONE: 'kataleya.surface.last_notified_milestone',
  PRESENCE_LOG:           'kataleya.surface.presence_log',
  DARK_OVERRIDE:          'kataleya.surface.dark_override',
  PALETTE:                'kataleya.surface.palette',
  // Weekly review — one entry per ISO week: kataleya.surface.weekly_review_YYYY-WW
  WEEKLY_REVIEW_PREFIX:   'kataleya.surface.weekly_review_',
} as const;

// ── Canonical Fortress keys ─────────────────────────────────────────────────
const FK = {
  CHANNEL_ID: 'kataleya.fortress.sponsor_channel_id',
  TOKEN:      'kataleya.fortress.sponsor_token',
  ROLE:       'kataleya.fortress.sponsor_role',
  LAST_POLL:  'kataleya.fortress.sponsor_last_poll',
  INVITE:     'kataleya.fortress.sponsor_invite',
  CRYPTO_SK:  'kataleya.fortress.crypto_sk',
  CRYPTO_PK:  'kataleya.fortress.crypto_pk',
  PEER_PK:    'kataleya.fortress.peer_pk',
} as const;

// ── Unique ID ────────────────────────────────────────────────────────────────
function uid(): string {
  const a = Date.now().toString(36);
  const b = Math.random().toString(36).slice(2, 9);
  const c = Math.random().toString(36).slice(2, 6);
  return `${a}-${b}-${c}`;
}

// ── ISO week key — 'YYYY-WW' ─────────────────────────────────────────────────
// offset: 0 = current week, -1 = last week
export function getISOWeekKey(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  // ISO week: Thursday determines the year
  const thursday = new Date(d);
  thursday.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3);
  const year = thursday.getFullYear();
  const jan4 = new Date(year, 0, 4);
  const week = Math.ceil(((thursday.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
  return `${year}-${String(week).padStart(2, '0')}`;
}

// ── Fortress helpers (SecureStore, web-safe) ─────────────────────────────────
async function fortressSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function fortressGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function fortressDel(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface MoodLog {
  id: string;
  ts: number;
  moodScore: number;             // 1–10
  context?: string;
  circadianPhase: string;
  restlessness: number;          // 0.0–1.0
  correction?: string;           // user override: 'dancing', 'commuting', etc.
}

export interface JournalEntry {
  id: string;
  ts: number;
  body: string;
  moodScore?: number;
  circadianPhase: string;
}

export interface UrgeLog {
  id: string;
  ts: number;
  intensity: number;        // 1–10
  triggerQ: number;         // which question variant was shown
  trigger?: string;         // user answer
  responseQ: number;
  response?: string;
  passedQ: number;
  passed: boolean;          // did the urge pass without acting?
  circadianPhase: string;
}

export interface WeeklyReview {
  weekKey: string;           // ISO week: 'YYYY-WW'
  ts: number;                // timestamp of last save
  scores: {
    sobriety:   number | null;   // 1–10
    mood:       number | null;
    sleep:      number | null;
    physical:   number | null;
    connection: number | null;
    treatment:  number | null;
    schedule:   number | null;
  };
  win: string;               // biggest win this week
  adjustment: string;        // one thing to adjust next week
}

export interface CircadianEvent {
  ts: number;
  phase: string;
  event: 'app_open' | 'mood_log' | 'journal_write' | 'sponsor_signal';
}

export interface SponsorChannel {
  channelId: string;
  token: string;
  role: 'user' | 'sponsor';
}

// ── Surface (AsyncStorage) ───────────────────────────────────────────────────
export const Surface = {
  async setOnboarded(): Promise<void> {
    await AsyncStorage.setItem(SK.ONBOARDED, '1');
  },
  async hasOnboarded(): Promise<boolean> {
    return (await AsyncStorage.getItem(SK.ONBOARDED)) === '1';
  },
  async setName(name: string): Promise<void> {
    await AsyncStorage.setItem(SK.NAME, name.trim().slice(0, 64));
  },
  async getName(): Promise<string | null> {
    return AsyncStorage.getItem(SK.NAME);
  },
  async setSubstance(s: string): Promise<void> {
    await AsyncStorage.setItem(SK.SUBSTANCE, s.trim().slice(0, 64));
  },
  async getSubstance(): Promise<string | null> {
    return AsyncStorage.getItem(SK.SUBSTANCE);
  },
  async setSobrietyStart(isoDate: string): Promise<void> {
    await AsyncStorage.setItem(SK.SOBRIETY_START, isoDate);
  },
  async getSobrietyStart(): Promise<string | null> {
    return AsyncStorage.getItem(SK.SOBRIETY_START);
  },
  async clearSobrietyStart(): Promise<void> {
    await AsyncStorage.removeItem(SK.SOBRIETY_START);
  },
  /**
   * Write a burn tombstone immediately before calling burnAll().
   * Purpose: crash-recovery signal. If the app is killed mid-wipe, the next
   * launch detects this key and can complete the burn. The tombstone is itself
   * erased by clearAll() — so a clean burn leaves nothing behind.
   */
  async writeBurnTombstone(): Promise<void> {
    await AsyncStorage.setItem(
      SK.BURN_LOG,
      JSON.stringify({ ts: Date.now(), confirmed: true }),
    );
  },
  /** Return the burn tombstone if an incomplete wipe was detected at launch. */
  async getBurnTombstone(): Promise<{ ts: number; confirmed: boolean } | null> {
    const raw = await AsyncStorage.getItem(SK.BURN_LOG);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
  // ── Offline sponsor check-in queue ────────────────────────────────────────
  async setPendingCheckin(data: { ts: number; orchidStage?: string; milestones?: number }): Promise<void> {
    await AsyncStorage.setItem(SK.PENDING_CHECKIN, JSON.stringify(data));
  },
  async getPendingCheckin(): Promise<{ ts: number; orchidStage?: string; milestones?: number } | null> {
    const raw = await AsyncStorage.getItem(SK.PENDING_CHECKIN);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },
  async clearPendingCheckin(): Promise<void> {
    await AsyncStorage.removeItem(SK.PENDING_CHECKIN);
  },

  // ── Presence signal log (persistent, user-clearable) ──────────────────────
  async getPresenceLog(): Promise<{ id: string; type: 'water' | 'light'; timestamp: number }[]> {
    const raw = await AsyncStorage.getItem(SK.PRESENCE_LOG);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  },
  async appendPresenceLog(entries: { id: string; type: 'water' | 'light'; timestamp: number }[]): Promise<void> {
    const existing = await Surface.getPresenceLog();
    const ids = new Set(existing.map(e => e.id));
    const merged = [...existing, ...entries.filter(e => !ids.has(e.id))];
    await AsyncStorage.setItem(SK.PRESENCE_LOG, JSON.stringify(merged));
  },
  async clearPresenceLog(type?: 'water' | 'light'): Promise<void> {
    if (!type) {
      await AsyncStorage.removeItem(SK.PRESENCE_LOG);
      return;
    }
    const existing = await Surface.getPresenceLog();
    await AsyncStorage.setItem(SK.PRESENCE_LOG, JSON.stringify(existing.filter(e => e.type !== type)));
  },

  // ── Notification preferences ───────────────────────────────────────────────
  async setNotifEnabled(v: boolean): Promise<void> {
    await AsyncStorage.setItem(SK.NOTIF_ENABLED, v ? '1' : '0');
  },
  async getNotifEnabled(): Promise<boolean> {
    return (await AsyncStorage.getItem(SK.NOTIF_ENABLED)) === '1';
  },
  async setNotifReminderTime(hhmm: string): Promise<void> {
    await AsyncStorage.setItem(SK.NOTIF_REMINDER_TIME, hhmm);
  },
  async getNotifReminderTime(): Promise<string> {
    return (await AsyncStorage.getItem(SK.NOTIF_REMINDER_TIME)) ?? '20:00';
  },
  async setLastNotifiedMilestone(n: number): Promise<void> {
    await AsyncStorage.setItem(SK.LAST_NOTIFIED_MILESTONE, String(n));
  },
  async getLastNotifiedMilestone(): Promise<number> {
    const raw = await AsyncStorage.getItem(SK.LAST_NOTIFIED_MILESTONE);
    return raw ? parseInt(raw, 10) : 0;
  },

  async setDarkOverride(v: boolean): Promise<void> {
    await AsyncStorage.setItem(SK.DARK_OVERRIDE, v ? '1' : '0');
  },
  async getDarkOverride(): Promise<boolean> {
    return (await AsyncStorage.getItem(SK.DARK_OVERRIDE)) === '1';
  },

  async setPalette(id: string): Promise<void> {
    await AsyncStorage.setItem(SK.PALETTE, id);
  },
  async getPalette(): Promise<string> {
    return (await AsyncStorage.getItem(SK.PALETTE)) ?? 'ouroboros';
  },

  // ── Weekly review ──────────────────────────────────────────────────────────
  // Key format: kataleya.surface.weekly_review_YYYY-WW
  // Stores one review per ISO week. Burns with clearAll().
  async saveWeeklyReview(review: WeeklyReview): Promise<void> {
    const key = SK.WEEKLY_REVIEW_PREFIX + review.weekKey;
    await AsyncStorage.setItem(key, JSON.stringify(review));
  },

  async getWeeklyReview(weekKey: string): Promise<WeeklyReview | null> {
    const key = SK.WEEKLY_REVIEW_PREFIX + weekKey;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  },

  // Returns the most recent completed review (previous week), or null.
  async getLastWeeklyReview(): Promise<WeeklyReview | null> {
    const lastKey = getISOWeekKey(-1);
    return Surface.getWeeklyReview(lastKey);
  },

  async clearAll(): Promise<void> {
    // Clear fixed keys
    await AsyncStorage.multiRemove(Object.values(SK).filter(k => !k.endsWith('_')));
    // Clear dynamic weekly review keys
    const all = await AsyncStorage.getAllKeys();
    const reviewKeys = all.filter(k => k.startsWith(SK.WEEKLY_REVIEW_PREFIX));
    if (reviewKeys.length > 0) await AsyncStorage.multiRemove(reviewKeys as string[]);
  },
};

// ── Sanctuary (SQLite) ───────────────────────────────────────────────────────
// Web builds must never reach health data operations — hard throw enforced below.
// burnAll retains a web path to clean up any legacy AsyncStorage keys that may
// exist from earlier development builds.
const WEB_MOOD_KEY    = 'kataleya.sanctuary.mood_logs';
const WEB_JOURNAL_KEY = 'kataleya.sanctuary.journal_entries';

export const Sanctuary = {
  // ── Mood logs ──────────────────────────────────────────────────────────────
  async saveMoodLog(
    entry: Omit<MoodLog, 'id'>
  ): Promise<MoodLog> {
    const log: MoodLog = { ...entry, id: uid() };
    if (Platform.OS === 'web') return log;
    const { getDb } = await import('./db');
    const db = getDb();
    db.runSync(
      `INSERT INTO mood_logs (id, ts, mood_score, context, circadian_phase, restlessness, correction)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [log.id, log.ts, log.moodScore, log.context ?? null, log.circadianPhase, log.restlessness, log.correction ?? null]
    );
    await Sanctuary.logCircadianEvent({ ts: log.ts, phase: log.circadianPhase, event: 'mood_log' });
    return log;
  },

  async getMoodLogs(limit = 500): Promise<MoodLog[]> {
    if (Platform.OS === 'web') return [];
    const { getDb } = await import('./db');
    const rows = getDb().getAllSync<{
      id: string; ts: number; mood_score: number; context: string | null;
      circadian_phase: string; restlessness: number; correction: string | null;
    }>(
      `SELECT id, ts, mood_score, context, circadian_phase, restlessness, correction
       FROM mood_logs ORDER BY ts DESC LIMIT ?`,
      [limit]
    );
    return rows.map(r => ({
      id: r.id, ts: r.ts, moodScore: r.mood_score,
      context: r.context ?? undefined, circadianPhase: r.circadian_phase,
      restlessness: r.restlessness, correction: r.correction ?? undefined,
    }));
  },

  async applyMoodCorrection(id: string, correction: string): Promise<void> {
    if (Platform.OS === 'web') return;
    const { getDb } = await import('./db');
    getDb().runSync(`UPDATE mood_logs SET correction = ? WHERE id = ?`, [correction, id]);
  },

  async getRecentMoodState(): Promise<{ lastScore: number; hoursSince: number; avgRestlessness: number }> {
    const logs = await Sanctuary.getMoodLogs(5);
    if (!logs.length) return { lastScore: 5, hoursSince: 24, avgRestlessness: 0 };
    const last = logs[0];
    const hoursSince = (Date.now() - last.ts) / 3_600_000;
    const avg = logs.slice(0, 3).reduce((s, l) => s + l.restlessness, 0) / Math.min(logs.length, 3);
    return { lastScore: last.moodScore, hoursSince, avgRestlessness: avg };
  },

  // ── Journal ────────────────────────────────────────────────────────────────
  async saveJournalEntry(
    entry: Omit<JournalEntry, 'id'>
  ): Promise<JournalEntry> {
    const e: JournalEntry = { ...entry, id: uid() };
    if (Platform.OS === 'web') return e;
    const { getDb } = await import('./db');
    const db = getDb();
    db.runSync(
      `INSERT INTO journal_entries (id, ts, body, mood_score, circadian_phase)
       VALUES (?, ?, ?, ?, ?)`,
      [e.id, e.ts, e.body, e.moodScore ?? null, e.circadianPhase]
    );
    await Sanctuary.logCircadianEvent({ ts: e.ts, phase: e.circadianPhase, event: 'journal_write' });
    return e;
  },

  async getJournalEntries(limit = 200): Promise<JournalEntry[]> {
    if (Platform.OS === 'web') return [];
    const { getDb } = await import('./db');
    const rows = getDb().getAllSync<{
      id: string; ts: number; body: string; mood_score: number | null; circadian_phase: string;
    }>(
      `SELECT id, ts, body, mood_score, circadian_phase FROM journal_entries ORDER BY ts DESC LIMIT ?`,
      [limit]
    );
    return rows.map(r => ({
      id: r.id, ts: r.ts, body: r.body,
      moodScore: r.mood_score ?? undefined, circadianPhase: r.circadian_phase,
    }));
  },

  async deleteJournalEntry(id: string): Promise<void> {
    if (Platform.OS === 'web') return;
    const { getDb } = await import('./db');
    getDb().runSync(`DELETE FROM journal_entries WHERE id = ?`, [id]);
  },

  // ── Urge surfing log ───────────────────────────────────────────────────────
  async saveUrgeLog(
    entry: Omit<UrgeLog, 'id'>
  ): Promise<UrgeLog> {
    const e: UrgeLog = { ...entry, id: uid() };
    if (Platform.OS === 'web') return e;
    const { getDb } = await import('./db');
    getDb().runSync(
      `INSERT INTO urge_log
         (id, ts, intensity, trigger_q, trigger, response_q, response, passed_q, passed, circadian_phase)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        e.id, e.ts, e.intensity,
        e.triggerQ, e.trigger ?? null,
        e.responseQ, e.response ?? null,
        e.passedQ, e.passed ? 1 : 0,
        e.circadianPhase,
      ]
    );
    return e;
  },

  async getUrgeLogs(limit = 100): Promise<UrgeLog[]> {
    if (Platform.OS === 'web') return [];
    const { getDb } = await import('./db');
    const rows = getDb().getAllSync<{
      id: string; ts: number; intensity: number;
      trigger_q: number; trigger: string | null;
      response_q: number; response: string | null;
      passed_q: number; passed: number;
      circadian_phase: string;
    }>(
      `SELECT id, ts, intensity, trigger_q, trigger, response_q, response,
              passed_q, passed, circadian_phase
       FROM urge_log ORDER BY ts DESC LIMIT ?`,
      [limit]
    );
    return rows.map(r => ({
      id: r.id, ts: r.ts, intensity: r.intensity,
      triggerQ: r.trigger_q, trigger: r.trigger ?? undefined,
      responseQ: r.response_q, response: r.response ?? undefined,
      passedQ: r.passed_q, passed: r.passed === 1,
      circadianPhase: r.circadian_phase,
    }));
  },

  async deleteUrgeLog(id: string): Promise<void> {
    if (Platform.OS === 'web') return;
    const { getDb } = await import('./db');
    getDb().runSync(`DELETE FROM urge_log WHERE id = ?`, [id]);
  },

  // ── Batch restore (used by backup restore — transactional for performance) ─
  // Inserts thousands of rows in a single SQLite transaction instead of one
  // await per row. Prevents OS killing the app mid-restore when backgrounded.
  async batchRestoreMoodLogs(logs: Omit<MoodLog, 'id'>[]): Promise<void> {
    if (Platform.OS === 'web') return;
    if (!logs.length) return;
    const { getDb } = await import('./db');
    const db = getDb();
    db.execSync('BEGIN');
    try {
      for (const log of logs) {
        db.runSync(
          `INSERT INTO mood_logs (id, ts, mood_score, context, circadian_phase, restlessness, correction)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uid(), log.ts, log.moodScore, log.context ?? null, log.circadianPhase, log.restlessness, log.correction ?? null]
        );
      }
      db.execSync('COMMIT');
    } catch (e) {
      db.execSync('ROLLBACK');
      throw e;
    }
  },

  async batchRestoreJournalEntries(entries: Omit<JournalEntry, 'id'>[]): Promise<void> {
    if (Platform.OS === 'web') return;
    if (!entries.length) return;
    const { getDb } = await import('./db');
    const db = getDb();
    db.execSync('BEGIN');
    try {
      for (const entry of entries) {
        db.runSync(
          `INSERT INTO journal_entries (id, ts, body, mood_score, circadian_phase)
           VALUES (?, ?, ?, ?, ?)`,
          [uid(), entry.ts, entry.body, entry.moodScore ?? null, entry.circadianPhase]
        );
      }
      db.execSync('COMMIT');
    } catch (e) {
      db.execSync('ROLLBACK');
      throw e;
    }
  },

  // ── Circadian event log ────────────────────────────────────────────────────
  async logCircadianEvent(event: CircadianEvent): Promise<void> {
    if (Platform.OS === 'web') return; // no-op on web
    const { getDb } = await import('./db');
    getDb().runSync(
      `INSERT INTO circadian_log (ts, phase, event) VALUES (?, ?, ?)`,
      [event.ts, event.phase, event.event]
    );
  },

  async getCircadianLog(days = 90): Promise<CircadianEvent[]> {
    if (Platform.OS === 'web') return [];
    const since = Date.now() - days * 86_400_000;
    const { getDb } = await import('./db');
    const rows = getDb().getAllSync<{ ts: number; phase: string; event: string }>(
      `SELECT ts, phase, event FROM circadian_log WHERE ts >= ? ORDER BY ts DESC`,
      [since]
    );
    return rows.map(r => ({ ts: r.ts, phase: r.phase, event: r.event as CircadianEvent['event'] }));
  },

  // ── Burn ritual ────────────────────────────────────────────────────────────
  // wipeSQLiteData: erases all SQLite tables only. Does NOT touch Surface or
  // Fortress. Used by BurningRitual.tsx to allow the Surface tombstone to
  // survive until all native vaults are confirmed empty.
  async wipeSQLiteData(): Promise<void> {
    if (Platform.OS !== 'web') {
      const { getDb } = await import('./db');
      const db = getDb();
      db.runSync(`DELETE FROM mood_logs`);
      db.runSync(`DELETE FROM journal_entries`);
      db.runSync(`DELETE FROM urge_log`);
      db.runSync(`DELETE FROM circadian_log`);
    } else {
      await AsyncStorage.multiRemove([WEB_MOOD_KEY, WEB_JOURNAL_KEY]);
    }
  },

  // burnAll: full wipe of all three vaults. Used by backup.ts restorePayload()
  // before importing a backup. BurningRitual.tsx does NOT use this — it manages
  // the sequence manually to guarantee the tombstone outlives native vault wipes.
  async burnAll(): Promise<void> {
    await Sanctuary.wipeSQLiteData();
    await Surface.clearAll();
    await Fortress.clear();
  },
};

// ── Fortress (SecureStore) ───────────────────────────────────────────────────
export const Fortress = {
  async setInviteCode(code: string): Promise<void> {
    const safe = code.replace(/[^A-Z0-9]/g, '').slice(0, 12);
    await fortressSet(FK.INVITE, safe);
  },
  async getInviteCode(): Promise<string | null> {
    return fortressGet(FK.INVITE);
  },

  async setChannel(channelId: string, token: string, role: 'user' | 'sponsor'): Promise<void> {
    await Promise.all([
      fortressSet(FK.CHANNEL_ID, channelId),
      fortressSet(FK.TOKEN, token),
      fortressSet(FK.ROLE, role),
    ]);
  },
  async getChannel(): Promise<SponsorChannel | null> {
    const [channelId, token, role] = await Promise.all([
      fortressGet(FK.CHANNEL_ID),
      fortressGet(FK.TOKEN),
      fortressGet(FK.ROLE),
    ]);
    if (!channelId || !token || !role) return null;
    return { channelId, token, role: role as SponsorChannel['role'] };
  },

  async setLastPoll(ts: number): Promise<void> {
    await fortressSet(FK.LAST_POLL, String(ts));
  },
  async getLastPoll(): Promise<number> {
    const v = await fortressGet(FK.LAST_POLL);
    return v ? parseInt(v, 10) : 0;
  },

  async setCryptoKeyPair(publicKey: string, secretKey: string): Promise<void> {
    await Promise.all([
      fortressSet(FK.CRYPTO_PK, publicKey),
      fortressSet(FK.CRYPTO_SK, secretKey),
    ]);
  },
  async getCryptoKeyPair(): Promise<{ publicKey: string; secretKey: string } | null> {
    const [pk, sk] = await Promise.all([
      fortressGet(FK.CRYPTO_PK),
      fortressGet(FK.CRYPTO_SK),
    ]);
    if (!pk || !sk) return null;
    return { publicKey: pk, secretKey: sk };
  },

  async setPeerPublicKey(pk: string): Promise<void> {
    await fortressSet(FK.PEER_PK, pk);
  },
  async getPeerPublicKey(): Promise<string | null> {
    return fortressGet(FK.PEER_PK);
  },

  async clear(): Promise<void> {
    await Promise.all(Object.values(FK).map(fortressDel));
  },
};

// ── Legacy shim — keeps SponsorVault callers working during migration ─────────
/** @deprecated Use Fortress directly. */
export const SponsorVault = {
  setInviteCode: Fortress.setInviteCode,
  getInviteCode: Fortress.getInviteCode,
  setChannel: Fortress.setChannel,
  getChannel: Fortress.getChannel,
  setLastPoll: Fortress.setLastPoll,
  getLastPoll: Fortress.getLastPoll,
  clear: Fortress.clear,
};

/** @deprecated Use Sanctuary/Surface directly. */
export const PrivateVault = {
  saveJournalEntry: (entry: Omit<JournalEntry, 'id'>) => Sanctuary.saveJournalEntry(entry),
  getJournalEntries: () => Sanctuary.getJournalEntries(),
  deleteEntry: (id: string) => Sanctuary.deleteJournalEntry(id),
};
