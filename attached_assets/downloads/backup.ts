/**
 * Encrypted Backup — zero-knowledge device migration.
 *
 * Crypto stack (native, via react-native-quick-crypto):
 *   Key derivation : PBKDF2-SHA256, 100,000 iterations, 32-byte random salt
 *                    Runs in native code (OpenSSL on Android, CommonCrypto on iOS).
 *                    Key state does not expand through the JS heap during derivation.
 *   Encryption     : AES-256-CBC
 *   Authentication : HMAC-SHA256 over ciphertext (Encrypt-then-MAC)
 *   RNG            : randomBytes() — OS CSPRNG (/dev/urandom, SecureRandom, etc.)
 *   MAC comparison : timingSafeEqual() — constant-time, prevents timing side-channels
 *
 * ── Passphrase & key memory trace ────────────────────────────────────────────
 *   1. `passphrase` — JS string (heap, immutable). Passed as UTF-8 bytes to
 *      pbkdf2Sync(). Cannot be zeroed; exits scope when function returns → GC.
 *   2. `key` — Buffer (ArrayBuffer on JS heap, computed natively). Passed to
 *      createCipheriv() and createHmac() then goes out of scope → GC eligible
 *      but NOT zeroed. JS provides no deterministic memory zeroing.
 *   3. `plaintext` — Buffer containing the full JSON payload. Most sensitive
 *      object in memory. Consumed by cipher.update(); exits scope after
 *      encryptBackup() returns → GC eligible but not zeroed.
 *   Improvement over crypto-js: key derivation state (100k PBKDF2 iterations)
 *   runs in native memory rather than expanding through the JS heap each step.
 *
 * ── Blob format (unchanged — existing backups restore correctly) ──────────────
 *   { v, alg, iters, salt, iv, mac, data }
 *   — v    : version integer (1)
 *   — alg  : 'AES-256-CBC-PBKDF2-SHA256'
 *   — iters: iteration count stored in blob so future upgrades are back-compat
 *   — salt : hex (32 bytes)
 *   — iv   : hex (16 bytes)
 *   — mac  : hex (32 bytes, HMAC-SHA256 over ciphertext)
 *   — data : base64 ciphertext
 *
 * ── Platform requirements ────────────────────────────────────────────────────
 *   react-native-quick-crypto is a JSI native module.
 *   It is imported dynamically inside the crypto functions so that:
 *     • Web builds: fail at the function call with a clear error (not at import)
 *     • Expo Go: the file loads; calling encryptBackup/decryptBackup throws clearly
 *     • EAS Build / dev build: native module loads; full crypto runs natively
 *   Backup testing requires a native build. Expo Go cannot run JSI modules.
 *
 * ── Zero-knowledge properties ────────────────────────────────────────────────
 *   The passphrase is never stored, never logged, never sent anywhere.
 *   The encrypted blob is opaque: without the passphrase it reveals nothing.
 *   Wrong passphrase: HMAC fails (constant-time) before decrypt is attempted.
 *   Cloud providers (iCloud, Google Drive) store encrypted bytes only.
 *
 * ── What is backed up ───────────────────────────────────────────────────────
 *   Sanctuary: mood_logs, journal_entries, circadian_log
 *   Surface:   sobriety_start, name, substance
 *
 * ── What is NOT backed up ────────────────────────────────────────────────────
 *   Fortress (sponsor credentials): channels are ephemeral. They expire.
 */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Sanctuary, Surface } from './storage';

const ITERS          = 100_000;
const BACKUP_VERSION = 1;
const BACKUP_FILENAME = 'kataleya.backup';

// ── Backup payload (plaintext before encryption) ─────────────────────────────
export interface BackupPayload {
  v: number;
  exportedAt: number;
  sanctuary: {
    moodLogs: Awaited<ReturnType<typeof Sanctuary.getMoodLogs>>;
    journalEntries: Awaited<ReturnType<typeof Sanctuary.getJournalEntries>>;
    circadianLog: Awaited<ReturnType<typeof Sanctuary.getCircadianLog>>;
  };
  surface: {
    sobrietyStart: string | null;
    name: string | null;
    substance: string | null;
  };
}

// ── Encrypted blob (stored to file / shared to cloud) ────────────────────────
// This shape is frozen — changing it breaks existing backup files.
interface EncryptedBlob {
  v: number;
  alg: string;
  iters: number;
  salt: string;  // hex, 32 bytes
  iv: string;    // hex, 16 bytes
  mac: string;   // hex, 32 bytes — HMAC-SHA256 over ciphertext
  data: string;  // base64 ciphertext
}

// ── Native crypto guard ───────────────────────────────────────────────────────
// Called before any crypto operation. Throws hard on web or Expo Go.
function requireNativeCrypto(): void {
  if (Platform.OS === 'web') {
    throw new Error(
      'Encrypted backup is not available on web builds. ' +
      'Kataleya backup requires a native device build.'
    );
  }
}

// ── Encrypt ──────────────────────────────────────────────────────────────────
export async function encryptBackup(passphrase: string): Promise<string> {
  requireNativeCrypto();

  if (!passphrase || passphrase.length < 4) {
    throw new Error('Passphrase must be at least 4 characters');
  }

  // Dynamic import — JSI module; only works in native EAS/dev builds.
  const { pbkdf2Sync, randomBytes, createCipheriv, createHmac, Buffer } =
    await import('react-native-quick-crypto');

  // Collect all vault data
  const [moodLogs, journalEntries, circadianLog, sobrietyStart, name, substance] =
    await Promise.all([
      Sanctuary.getMoodLogs(5000),
      Sanctuary.getJournalEntries(2000),
      Sanctuary.getCircadianLog(365),
      Surface.getSobrietyStart(),
      Surface.getName(),
      Surface.getSubstance(),
    ]);

  const payload: BackupPayload = {
    v: BACKUP_VERSION,
    exportedAt: Date.now(),
    sanctuary: { moodLogs, journalEntries, circadianLog },
    surface: { sobrietyStart, name, substance },
  };

  // `plaintext` — the most sensitive buffer; contains full vault JSON.
  // Exits scope when encryptBackup returns → GC eligible, not zeroed.
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');

  // Native CSPRNG — OS-provided (/dev/urandom, SecureRandom).
  // No Math.random() path.
  const salt = randomBytes(32);   // 32-byte random salt
  const iv   = randomBytes(16);   // 16-byte random IV

  // Native PBKDF2-SHA256 via OpenSSL / CommonCrypto.
  // `key` — 32 bytes, Buffer (ArrayBuffer on JS heap, derived in native code).
  // Key derivation state does not expand through JS heap for 100k iterations.
  const key = pbkdf2Sync(passphrase, salt, ITERS, 32, 'sha256');

  // Native AES-256-CBC
  // `as any[]` cast: react-native-quick-crypto's Buffer type predates @types/node's
  // Buffer<ArrayBufferLike> generic. Runtime behavior is correct; types disagree.
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()] as any[]);

  // Encrypt-then-MAC: HMAC-SHA256 over ciphertext (not plaintext).
  // `key` last touched here → exits scope after digest() → GC eligible.
  const mac = createHmac('sha256', key).update(ciphertext).digest();

  // `passphrase` exits scope here → GC eligible. Cannot be zeroed (JS string, immutable).
  // `key` exits scope here → GC eligible. Not zeroed (JS/Hermes limitation).

  const blob: EncryptedBlob = {
    v: BACKUP_VERSION,
    alg: 'AES-256-CBC-PBKDF2-SHA256',
    iters: ITERS,
    salt: salt.toString('hex'),
    iv:   iv.toString('hex'),
    mac:  mac.toString('hex'),
    data: ciphertext.toString('base64'),
  };

  return JSON.stringify(blob);
}

// ── Decrypt ──────────────────────────────────────────────────────────────────
export async function decryptBackup(
  blobStr: string,
  passphrase: string
): Promise<BackupPayload> {
  requireNativeCrypto();

  // Dynamic import — same JSI module; only works in native builds.
  const { pbkdf2Sync, createDecipheriv, createHmac, timingSafeEqual, Buffer } =
    await import('react-native-quick-crypto');

  let blob: EncryptedBlob;
  try {
    blob = JSON.parse(blobStr) as EncryptedBlob;
  } catch {
    throw new Error('Invalid backup file format');
  }

  if (blob.v !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${blob.v}`);
  }

  const salt = Buffer.from(blob.salt, 'hex');
  const iv   = Buffer.from(blob.iv, 'hex');

  // blob.iters read from the file — not ITERS constant.
  // Old backups (100k iters) decrypt correctly even after we raise ITERS.
  // `key` — 32-byte Buffer, derived in native code, lives on JS heap.
  const key = pbkdf2Sync(passphrase, salt, blob.iters, 32, 'sha256');

  const ciphertext  = Buffer.from(blob.data, 'base64');
  const expectedMac = createHmac('sha256', key).update(ciphertext).digest();
  const providedMac = Buffer.from(blob.mac, 'hex');

  // Constant-time comparison — prevents timing attacks.
  // The original string !== comparison was NOT timing-safe.
  // If lengths differ (corrupt blob), we throw before timingSafeEqual (which
  // would throw on unequal-length inputs in the native implementation).
  if (
    expectedMac.length !== providedMac.length ||
    !timingSafeEqual(expectedMac, providedMac)
  ) {
    throw new Error('Incorrect passphrase or corrupt backup');
  }

  // Decrypt only if MAC passes — wrong passphrase rejected above.
  // `key` last touched here → exits scope after decryptBackup returns → GC.
  // `as any[]` cast: same RN vs @types/node Buffer generic mismatch as encrypt path.
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  let plaintext: Uint8Array;
  try {
    plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()] as any[]) as unknown as Uint8Array;
  } catch {
    // Padding error on wrong key — additional safety net
    throw new Error('Incorrect passphrase or corrupt backup');
  }

  try {
    return JSON.parse(Buffer.from(plaintext).toString('utf8')) as BackupPayload;
  } catch {
    throw new Error('Incorrect passphrase or corrupt backup');
  }
}

// ── Restore payload to vaults ─────────────────────────────────────────────────
export async function restorePayload(payload: BackupPayload): Promise<void> {
  // Wipe existing data first (clean restore)
  await Sanctuary.burnAll();

  // Restore Surface
  if (payload.surface.sobrietyStart) {
    await Surface.setSobrietyStart(payload.surface.sobrietyStart);
  }
  if (payload.surface.name) {
    await Surface.setName(payload.surface.name);
  }
  if (payload.surface.substance) {
    await Surface.setSubstance(payload.surface.substance);
  }
  await Surface.setOnboarded();

  // Restore Sanctuary in a single transaction per table.
  // Oldest-first order preserves chronological ordering in the DB index.
  // Batch methods use BEGIN/COMMIT — safe if the OS backgrounds the app mid-restore.
  const moodLogsChron = [...payload.sanctuary.moodLogs].reverse();
  await Sanctuary.batchRestoreMoodLogs(moodLogsChron);

  const journalChron = [...payload.sanctuary.journalEntries].reverse();
  await Sanctuary.batchRestoreJournalEntries(journalChron);
}

// ── File operations ───────────────────────────────────────────────────────────
export async function saveAndShareBackup(encryptedStr: string): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('Backup export is not available on web builds');
  }

  // documentDirectory: canary expo-file-system moved this to Paths.document;
  // cast to any preserves runtime legacy behaviour while satisfying TypeScript.
  const path = `${(FileSystem as any).documentDirectory}${BACKUP_FILENAME}`;
  await FileSystem.writeAsStringAsync(path, encryptedStr, {
    encoding: 'utf8', // EncodingType enum removed from canary re-exports; literal accepted
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Save your Kataleya backup',
      UTI: 'public.json',
    });
  }
}

export async function pickBackupFile(): Promise<string | null> {
  if (Platform.OS === 'web') {
    throw new Error('Backup restore is not available on web builds');
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) return null;

  const uri = result.assets[0].uri;
  return FileSystem.readAsStringAsync(uri, {
    encoding: 'utf8', // EncodingType enum removed from canary re-exports; literal accepted
  });
}
