import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

let _db: SQLiteDatabase | null = null;

// Bump this integer whenever the schema changes.
// Each migration block runs exactly once per install.
const SCHEMA_VERSION = 1;

export function getDb(): SQLiteDatabase {
  if (_db) return _db;
  if (Platform.OS === 'web') {
    throw new Error('SQLite unavailable on web — Sanctuary is native-only');
  }
  _db = openDatabaseSync('kataleya.db', { enableChangeListener: false });
  _db.execSync(`PRAGMA journal_mode = WAL;`);
  _db.execSync(`PRAGMA foreign_keys = ON;`);
  migrate(_db);
  return _db;
}

function migrate(db: SQLiteDatabase): void {
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;

  // ── v1: initial schema ─────────────────────────────────────────────────────
  if (version < 1) {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS mood_logs (
        id               TEXT PRIMARY KEY NOT NULL,
        ts               INTEGER NOT NULL,
        mood_score       INTEGER NOT NULL CHECK (mood_score BETWEEN 1 AND 10),
        context          TEXT,
        circadian_phase  TEXT NOT NULL,
        restlessness     REAL NOT NULL DEFAULT 0 CHECK (restlessness >= 0 AND restlessness <= 1),
        correction       TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_mood_ts ON mood_logs (ts DESC);

      CREATE TABLE IF NOT EXISTS journal_entries (
        id               TEXT PRIMARY KEY NOT NULL,
        ts               INTEGER NOT NULL,
        body             TEXT NOT NULL,
        mood_score       INTEGER CHECK (mood_score BETWEEN 1 AND 10),
        circadian_phase  TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_journal_ts ON journal_entries (ts DESC);

      CREATE TABLE IF NOT EXISTS circadian_log (
        id     INTEGER PRIMARY KEY AUTOINCREMENT,
        ts     INTEGER NOT NULL,
        phase  TEXT NOT NULL,
        event  TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_circ_ts ON circadian_log (ts DESC);
    `);
    db.runSync(`PRAGMA user_version = 1`);
  }

  // ── v2 (example): add tags column to journal_entries ──────────────────────
  // if (version < 2) {
  //   db.runSync(`ALTER TABLE journal_entries ADD COLUMN tags TEXT`);
  //   db.runSync(`PRAGMA user_version = 2`);
  // }
}
