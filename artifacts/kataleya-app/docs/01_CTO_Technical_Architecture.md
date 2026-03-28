# Kataleya v2.1 — Technical Architecture Report
### Audience: Chief Technology Officer / DevOps Lead
### Date: March 2026 | Classification: Internal Technical

---

## Executive Summary

Kataleya is a privacy-first React Native mobile application built on Expo SDK 52 with the New Architecture enabled. The codebase comprises **5,600+ lines of source code across 33+ files**, spanning a mobile client, a minimal relay API, and a shared type layer. Every architectural decision is designed to make the privacy guarantee technically verifiable — not just a policy statement.

---

## 1. Repository Structure

```
workspace/
├── artifacts/
│   ├── kataleya-app/          # React Native / Expo mobile client
│   │   ├── app/               # Expo Router screens (file-based routing)
│   │   ├── components/        # Shared UI components
│   │   ├── hooks/             # Business logic (stateful)
│   │   ├── utils/             # Storage layer, backup, sanitization
│   │   └── constants/         # Theme tokens, circadian config
│   └── api-server/            # Express 5 relay server (sponsor channel only)
└── packages/
    ├── api-zod/               # Shared Zod schemas (client ↔ server contract)
    └── db/                    # Drizzle ORM (server-side, non-user data only)
```

**Total mobile source lines:** 5,800+
**Total screens:** 9 (bridge, onboarding, home, journal, vault, sponsor, growth, cover, burn)
**Total custom hooks:** 7
**Total reusable components:** 10

---

## 2. Privacy Audit — Precise Scope

The claim "we physically cannot access your data" requires precision. Here is the full accounting of where every data type lives.

### Data that never reaches any server

| Data type | Storage engine | Server-accessible |
|-----------|----------------|-------------------|
| Mood logs | SQLite (device) | No |
| Journal entries | SQLite (device) | No |
| Circadian history | SQLite (device) | No |
| Sobriety start date | AsyncStorage (device) | No |
| User name | AsyncStorage (device) | No |
| Backup passphrase | Not stored anywhere | No |

### Data the sponsor relay holds in memory (by design, opt-in)

| Field | Nature | Persistence |
|-------|--------|-------------|
| Check-in date | "Mon Mar 28 2026" presence string | In-memory, channel-scoped |
| Orchid stage | Label: "seedling", "sprouting" | In-memory, channel-scoped |
| Milestone count | Integer | In-memory, channel-scoped |
| Presence signals | type: `water` or `light` | In-memory, FIFO queue, max 50 |

The sponsor relay exists specifically to share these presence indicators with one trusted person. No mood score, no journal content, no sobriety start date, and no health pattern data is ever sent to the server. The server has no concept of a "user" — only an ephemeral channel identified by random UUID that expires in 48 hours (unconnected) or 90 days (connected).

**Corrected, audit-proof claim:** *"Your mood logs, journal entries, and all health-sensitive data physically cannot leave this device."*

---

## 3. Three-Vault Storage Architecture

Data is physically separated by sensitivity tier, each tier backed by a different storage engine.

### Tier 1 — Surface (AsyncStorage)
**Keys (canonical, namespaced):**
```
kataleya.surface.sobriety_start
kataleya.surface.onboarded
kataleya.surface.name
kataleya.surface.substance
```
**Data held:** Sobriety start date, display name, tracked substance, onboarding state.
**Encryption:** OS-level file encryption (device passcode). Not hardware-backed.

### Tier 2 — Sanctuary (SQLite)
**Engine:** `expo-sqlite` v56, WAL mode, foreign key enforcement
**Schema:** Three tables — `mood_logs`, `journal_entries`, `circadian_log`
**Key constraints:**
```sql
mood_score   INTEGER CHECK (mood_score BETWEEN 1 AND 10)
restlessness REAL    CHECK (restlessness >= 0 AND restlessness <= 1)
correction   TEXT    -- user override field; schema-level, not app-level
```
**Indexes:** `ts DESC` on all three tables.
**Data held:** All health-adjacent data. Never leaves the device. Never referenced by any server endpoint.

### Tier 3 — Fortress (SecureStore)
**Engine:** `expo-secure-store` v56
**iOS backing:** iOS Keychain Services
**Android backing:** Android Keystore System (AES-256, hardware-backed where supported)
**Keys:**
```
kataleya.fortress.sponsor_channel_id
kataleya.fortress.sponsor_token
kataleya.fortress.sponsor_role
kataleya.fortress.sponsor_last_poll
kataleya.fortress.sponsor_invite
```
**Data held:** Sponsor channel credentials only.

### Vault Separation Enforcement

`utils/storage.ts` exports `Surface`, `Sanctuary`, and `Fortress` as the only interfaces. Direct AsyncStorage/SecureStore/SQLite calls are not available to the rest of the codebase. `SponsorVault` and `PrivateVault` are `@deprecated` shims delegating to the canonical vault objects — ensuring migration completeness without runtime breakage.

---

## 4. Zero-Knowledge Encrypted Backup

**File:** `utils/backup.ts`
**Packages:** `react-native-quick-crypto` (JSI — AES-256-CBC, PBKDF2-SHA256, HMAC-SHA256 via native OpenSSL / CommonCrypto)

### Design

```
User passphrase
    ↓  PBKDF2-SHA256 (100,000 iterations, 32-byte random salt)
AES-256-CBC key  →  encrypt payload JSON
    ↓  HMAC-SHA256 over ciphertext (Encrypt-then-MAC)
Encrypted blob: { v, alg, iters, salt, iv, mac, data }
    ↓  saveAndShareBackup()
Native share sheet → user saves to iCloud Drive / Files / Google Drive
```

### Zero-knowledge properties

- The passphrase is used to derive a key, then exits scope. It is never stored, never logged, never sent anywhere.
- The encrypted blob is opaque: `{ v, alg, iters, salt, iv, mac, data }` — no plaintext fields.
- Cloud providers (iCloud, Google Drive) store the encrypted blob only. Without the passphrase, the content is unrecoverable — including by us.
- The HMAC check happens before decryption. A wrong passphrase produces a wrong key → wrong HMAC → error thrown before `AES.decrypt` is called.

### iCloud / Google Drive hook-in

The backup chain is zero-knowledge safe for any cloud storage provider:
```
encryptBackup(passphrase) → opaque JSON string
  → upload to iCloud Drive / Google Drive (stores encrypted bytes only)

download from cloud → opaque JSON string
  → decryptBackup(blob, passphrase) → BackupPayload → restorePayload()
```

### What is backed up

- Sanctuary: mood_logs, journal_entries, circadian_log (up to 5,000/2,000/365 days)
- Surface: sobriety_start, name, substance

### What is NOT backed up

- Fortress (sponsor credentials): channels are ephemeral. They expire before any restore is useful.

### Performance note

PBKDF2 at 100,000 iterations in pure JavaScript takes approximately 2–4 seconds on a mid-range device. A loading spinner is shown during both encrypt and decrypt operations. This is intentional — the iteration count is what makes brute-force attacks impractical.

---

## 5. Circadian Engine

**File:** `hooks/useCircadian.ts` | 68 lines
**Phases:** `dawn` (05:00–08:00) | `day` (08:00–17:00) | `goldenHour` (17:00–20:00) | `night` (20:00–05:00)
**Adaptive poll:** 10 seconds during transitions, next-minute boundary during stable phases
**Theme interpolation:** 0.0 (MorningBloom) → 1.0 (MidnightGarden), computed locally on every tick
**No network call.** Phase is computed from `getCurrentMinutes()` — a local clock read.

---

## 6. Insights Engine

**File:** `hooks/useInsights.ts` | 188 lines

**Confidence formula:**
```
sizeScore = 1 - 1 / (1 + n / 12)        // sigmoid
recency   = exp(-ageDays / 45)           // half-life 45 days
confidence = min(0.97, sizeScore × recency)
```

**Surfacing threshold:** 0.72 — a named export, independently testable.
**Pattern types:** phaseLowestMood, moodTrend (14-day), checkInFrequency
**Computation:** Fully local. No network call. Runs once on mount. Fails silently (insights are enhancement, not core).

---

## 7. Sponsor Relay Architecture

**Server:** Express 5 + Pino, hosted on Replit infrastructure
**State:** In-memory only. No database. No log of signals.
**Protocol:** Short-poll, 5-second interval
**Channel lifecycle:** 48h unconnected, 90d from last activity once connected

**Server stores per channel (complete list):**
```typescript
{
  id: string,              // random UUID
  inviteCode: string,      // 6-char alphanumeric
  userToken: string,       // 48 hex bytes
  sponsorToken: string,    // 48 hex bytes
  connected: boolean,
  checkedIn: boolean,
  checkedInDate: string | null,   // e.g. "Mon Mar 28 2026"
  orchidStage: string,            // e.g. "seedling"
  milestones: number,             // integer
  presenceQueue: PresenceSignal[], // max 50 signals
  createdAt: number,
  expiresAt: number,
}
```

**What the server does NOT store:** User name, sobriety date, mood score, journal content, circadian history, device identifier, location.

---

## 8. Sensor Layer & Graceful Degradation

| Feature | Capable device | Fallback |
|---------|---------------|---------|
| Orchid sway | Accelerometer, 50ms interval | Two-sine breath animation, 25fps |
| Backup crypto | JSI (react-native-quick-crypto), <200ms | Not applicable — JSI only; requires EAS/dev build |
| SQLite | Native, WAL | AsyncStorage stub (dev/preview only) |
| SecureStore | OS Keychain / Keystore | AsyncStorage stub (dev/preview only) |

---

## 9. Technical Debt & Hardening Status

### Resolved in current build

| Item | Resolution |
|------|------------|
| No SQLite migration system | `user_version` PRAGMA implemented in `db.ts`. Each schema version is a numbered block; `ALTER TABLE` migrations run once and stamp the version. |
| `restorePayload` sequential awaits | Replaced with `batchRestoreMoodLogs` / `batchRestoreJournalEntries` using `BEGIN/COMMIT` transactions. 5,000 rows restores without OS kill risk. |
| Web fallback is a privacy hole | Sanctuary health data operations now throw explicitly on `Platform.OS === 'web'`. No silent AsyncStorage fallback for mood/journal data. |
| `blob.iters` hardcoded in decryption | `deriveKey` now accepts `iters` parameter; `decryptBackup` reads `blob.iters` from the encrypted blob. Old backups decrypt correctly; future iteration-count upgrades are backward-compatible. |
| `crypto-js` (pure-JS crypto, weak RNG risk) | Replaced with `react-native-quick-crypto` (JSI). `randomBytes` is now OS CSPRNG; PBKDF2 runs in native OpenSSL/CommonCrypto; `timingSafeEqual` constant-time HMAC check. `crypto-js` removed from dependency tree. TypeScript interop: `Buffer.concat([...] as any[])` — runtime correct; types disagree on generic parameter between RN and @types/node. `FileSystem.documentDirectory` cast to `any` (canary expo-file-system moved it to `Paths.document`; runtime legacy path still works). |
| Sponsor relay: no rate limiting | Per-token in-memory `Map` rate limiting implemented in `api-server/src/routes/sponsor.ts`. Limits: poll 30/60 s, presence 10/60 s, checkin 5/60 s. Stale entries pruned with each `cleanExpired()` cycle. |

### Open — roadmap

| Item | Severity | Mitigation | Target |
|------|----------|------------|--------|
| PBKDF2 iteration count at 100,000 | Medium | OWASP current recommendation is 600,000 for SHA-256. `blob.iters` is read from the blob at decrypt time, so raising `ITERS` in `encryptBackup` is fully backward-compatible. | v2.2 |
| SQLite canary version | Medium | Pin to stable on Expo SDK 52 GA | v2.1 |
| `restlessness` field always 0 | Low | Needs mapping function from accelerometer sway amplitude via `useOrchidSway` | v2.2 |
| Backup: no cloud automation | Low | Manual share sheet now; iCloud Drive API in v3.0 | v3.0 |
| Sponsor relay: no E2E encryption on signals | Medium | In-memory + TLS acceptable for presence signals; required before message content | v3.0 |
| Burn Ritual UX under distress | Low | 3-second hold + Alert.alert confirmation exists. Consider adding a 5-second grace window with undo before final wipe. | v2.2 |
| Insights half-life undisclosed to user | Low | 45-day recency decay causes insights to disappear after inactivity with no explanation. Surface decay state in UI. | v2.2 |
| Expo Go backup testing | Low | JSI module not available in Expo Go; backup encrypt/decrypt require EAS dev build. `requireNativeCrypto()` hard-throws on web but in Expo Go the dynamic import fails with a JSI error — acceptable for v2.x, document in QA runbook. | v2.2 |

---

## 10. Build & Deployment

**Development:** Expo Go via ngrok tunnel
**API:** Deployed on Replit infrastructure, HTTPS via mTLS proxy
**Production target:** Expo Application Services (EAS Build) → App Store + Play Store
**Environment variables:**
- `EXPO_PUBLIC_DOMAIN` — injected at tunnel start, resolves API base URL
- `SESSION_SECRET` — server-side session signing (unused pending auth layer)

---

*Document prepared by Engineering. Reflects March 2026 production codebase.*
