import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, Alert, Keyboard, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useCircadian } from '@/hooks/useCircadian';
import { TAB_BAR_HEIGHT } from '@/constants/circadian';
import { Sanctuary } from '@/utils/storage';
import { encryptBackup, decryptBackup, restorePayload, saveAndShareBackup, pickBackupFile } from '@/utils/backup';
import { NeonCard, NEON_RGB } from '@/components/NeonCard';
import { HoldToConfirm } from '@/components/HoldToConfirm';

// ── FAQ data ─────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: 'Do you collect any analytics?',
    a: 'No. Kataleya has no analytics engine, no crash reporter, and no advertising network. There is no Firebase, Amplitude, Sentry, or Mixpanel. We are structurally incapable of collecting data about how you use the app.',
  },
  {
    q: 'Where is my data stored?',
    a: 'Everything lives on this device. Mood logs, journal entries, sobriety data, and your name are stored in a local SQLite database (Sanctuary vault). Sponsor credentials are held in the OS keychain (Fortress vault). Nothing is transmitted to any server.',
  },
  {
    q: 'What happens if I enable cloud backup?',
    a: 'The encrypted backup file leaves this device and goes to whatever destination you choose (iCloud, Google Drive, etc.). The file is AES-256 encrypted with your passphrase — we never see the contents. The key never leaves your phone. Once the file reaches a cloud provider, it is under their terms.',
  },
  {
    q: 'Is Kataleya HIPAA compliant?',
    a: 'Kataleya is designed with privacy-first architecture that exceeds typical app standards. Because no health data is transmitted to our servers, HIPAA obligations are minimized to the connection layer.',
  },
];

function phaseAccentRgb(phase: string): string {
  if (phase === 'goldenHour') return NEON_RGB.amber;
  if (phase === 'night')      return NEON_RGB.violet;
  if (phase === 'dawn')       return NEON_RGB.pink;
  return NEON_RGB.cyan;
}

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const { theme, phase } = useCircadian();
  const router = useRouter();
  const accentRgb = phaseAccentRgb(phase);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + TAB_BAR_HEIGHT : insets.bottom + TAB_BAR_HEIGHT;

  const [backupMode, setBackupMode] = useState<'idle' | 'create' | 'restore'>('idle');
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [backupConfirm, setBackupConfirm] = useState('');
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pendingBlob, setPendingBlob] = useState<string | null>(null);

  // ── FAQ accordion state ───────────────────────────────────────────────────
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // ── Export all data ───────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    try {
      const [logs, entries] = await Promise.all([
        Sanctuary.getMoodLogs(),
        Sanctuary.getJournalEntries(),
      ]);
      const payload = JSON.stringify({ mood_logs: logs, journal_entries: entries, exported_at: new Date().toISOString() }, null, 2);
      const path = `${FileSystem.cacheDirectory}kataleya-export.json`;
      await FileSystem.writeAsStringAsync(path, payload, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Export Kataleya data' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'your data has been saved',
        'you can open it with any notes app, send it to yourself, or keep it somewhere safe.',
        [{ text: 'got it', style: 'default' }]
      );
    } catch (e) {
      Alert.alert('export failed', e instanceof Error ? e.message : 'unknown error');
    } finally {
      setExporting(false);
    }
  };

  const resetBackup = () => {
    setBackupMode('idle'); setBackupPassphrase(''); setBackupConfirm('');
    setBackupMessage(null); setPendingBlob(null);
  };

  const handleCreateBackup = async () => {
    if (backupPassphrase.length < 4) { setBackupMessage({ text: 'passphrase must be at least 4 characters.', ok: false }); return; }
    if (backupPassphrase !== backupConfirm) { setBackupMessage({ text: 'passphrases do not match.', ok: false }); return; }
    Keyboard.dismiss(); setBackupBusy(true); setBackupMessage(null);
    try {
      const encrypted = await encryptBackup(backupPassphrase);
      await saveAndShareBackup(encrypted);
      setBackupMessage({ text: 'backup encrypted and exported.', ok: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetBackup();
    } catch (e: unknown) {
      setBackupMessage({ text: e instanceof Error ? e.message : 'backup failed.', ok: false });
    } finally { setBackupBusy(false); }
  };

  const handlePickFile = async () => {
    try {
      const blob = await pickBackupFile();
      if (!blob) return;
      setPendingBlob(blob); setBackupMode('restore');
    } catch (e: unknown) {
      setBackupMessage({ text: e instanceof Error ? e.message : 'could not read backup file.', ok: false });
    }
  };

  const handleRestoreBackup = async () => {
    if (!pendingBlob || backupPassphrase.length < 1) {
      setBackupMessage({ text: 'enter the passphrase used when creating the backup.', ok: false }); return;
    }
    Alert.alert('replace all data?',
      'this will permanently overwrite your current vaults with the backup. this cannot be undone.',
      [
        { text: 'cancel', style: 'cancel' },
        { text: 'restore', style: 'destructive', onPress: async () => {
          Keyboard.dismiss(); setBackupBusy(true); setBackupMessage(null);
          try {
            const payload = await decryptBackup(pendingBlob!, backupPassphrase);
            await restorePayload(payload);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setBackupMessage({ text: 'vault restored successfully.', ok: true });
            resetBackup();
          } catch (e: unknown) {
            setBackupMessage({ text: e instanceof Error ? e.message : 'restore failed.', ok: false });
          } finally { setBackupBusy(false); }
        }},
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── PRIVACY ARCHITECTURE ── */}
        <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)`, marginTop: 8 }]}>
          privacy architecture
        </Text>
        <NeonCard theme={theme} accentRgb={accentRgb} fillIntensity={0.03} borderIntensity={0.12}>
          {[
            { tier: 'Fortress',  rgb: NEON_RGB.amber,  desc: 'sponsor credentials · OS keychain-backed · 8 hardware keys' },
            { tier: 'Sanctuary', rgb: NEON_RGB.cyan,   desc: 'mood · journal · circadian log · never synced' },
            { tier: 'Surface',   rgb: NEON_RGB.violet, desc: 'preferences · sobriety date · non-sensitive · 11 keys' },
          ].map((v, i, arr) => (
            <View key={v.tier} style={[styles.vaultRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: `rgba(${accentRgb},0.08)` }]}>
              <View style={styles.vaultHeader}>
                <View style={[styles.vaultDot, { backgroundColor: `rgba(${v.rgb},0.85)` }]} />
                <Text style={[styles.vaultTier, { color: `rgba(${v.rgb},0.9)` }]}>{v.tier}</Text>
              </View>
              <Text style={[styles.vaultDesc, { color: `${theme.textMuted}80` }]}>{v.desc}</Text>
            </View>
          ))}
        </NeonCard>

        <NeonCard theme={theme} glowColor="cyan" fillIntensity={0.05} borderIntensity={0.2} style={{ marginTop: 4 }}>
          <View style={styles.assuranceInner}>
            <Text style={[styles.assuranceText, { color: `rgba(${NEON_RGB.cyan},0.75)` }]}>
              we are physically unable to access your data.{'\n'}there is no server. there is no account. there is no trace.
            </Text>
          </View>
        </NeonCard>

        {/* ── YOUR RIGHTS ── */}
        <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)`, marginTop: 24 }]}>
          your rights
        </Text>
        <NeonCard theme={theme} accentRgb={accentRgb} fillIntensity={0.03} borderIntensity={0.12}>
          {/* Export */}
          <View style={[styles.rightsRow, { borderBottomWidth: 1, borderBottomColor: `rgba(${accentRgb},0.08)` }]}>
            <View style={[styles.rightsIcon, { backgroundColor: `rgba(${accentRgb},0.1)`, borderColor: `rgba(${accentRgb},0.2)` }]}>
              <Text style={styles.rightsIconText}>⬇</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rightsLabel, { color: theme.text }]}>Export all data</Text>
              <Text style={[styles.rightsHint, { color: `${theme.textMuted}80` }]}>Save a copy of your data to your files</Text>
            </View>
            <TouchableOpacity
              style={[styles.rightsBtn, { borderColor: `rgba(${accentRgb},0.35)`, backgroundColor: `rgba(${accentRgb},0.08)` }]}
              onPress={handleExportData}
              disabled={exporting}
            >
              {exporting
                ? <ActivityIndicator size="small" color={`rgba(${accentRgb},0.8)`} />
                : <Text style={[styles.rightsBtnText, { color: `rgba(${accentRgb},0.9)` }]}>Export</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Delete */}
          <View style={styles.rightsRow}>
            <View style={[styles.rightsIcon, { backgroundColor: 'rgba(255,107,107,0.1)', borderColor: 'rgba(255,107,107,0.2)' }]}>
              <Text style={styles.rightsIconText}>✕</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rightsLabel, { color: theme.text }]}>Delete all data</Text>
              <Text style={[styles.rightsHint, { color: `${theme.textMuted}80` }]}>Permanent and immediate</Text>
            </View>
            <TouchableOpacity
              style={[styles.rightsBtn, { borderColor: 'rgba(255,107,107,0.5)', backgroundColor: 'rgba(255,107,107,0.1)' }]}
              onPress={() => router.push('/burn')}
            >
              <Text style={[styles.rightsBtnText, { color: 'rgba(255,107,107,0.9)' }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </NeonCard>

        {/* ── ENCRYPTED BACKUP ── */}
        <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)`, marginTop: 24 }]}>encrypted backup</Text>
        <NeonCard theme={theme} accentRgb={accentRgb}>
          <View style={styles.cardInner}>
            <Text style={[styles.cardHint, { color: `${theme.textMuted}80` }]}>
              device-to-device migration. AES-256 encrypted with your passphrase.{'\n'}
              the key never leaves this phone. we see only opaque bytes.
            </Text>

            {backupMode === 'idle' && (
              <View style={styles.backupIdleRow}>
                <TouchableOpacity
                  style={[styles.backupBtn, { borderColor: `rgba(${accentRgb},0.45)`, backgroundColor: `rgba(${accentRgb},0.08)` }]}
                  onPress={() => { setBackupMessage(null); setBackupMode('create'); }}>
                  <Text style={[styles.backupBtnText, { color: `rgba(${accentRgb},0.9)` }]}>create backup</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.backupBtn, { borderColor: `rgba(${accentRgb},0.18)`, backgroundColor: `rgba(${accentRgb},0.04)` }]}
                  onPress={() => { setBackupMessage(null); handlePickFile(); }}>
                  <Text style={[styles.backupBtnText, { color: `rgba(${accentRgb},0.55)` }]}>restore backup</Text>
                </TouchableOpacity>
              </View>
            )}

            {backupMode === 'create' && (
              <>
                <NeonCard theme={theme} glowColor="amber" fillIntensity={0.06} borderIntensity={0.25}>
                  <View style={styles.warningInner}>
                    <Text style={[styles.warningLabel, { color: `rgba(${NEON_RGB.amber},0.7)` }]}>before you export</Text>
                    <Text style={[styles.warningText, { color: `rgba(${NEON_RGB.amber},0.6)` }]}>
                      the encrypted file will leave this device the moment you save or share it. once it reaches icloud, google drive, or any other destination, it is under that provider's control.{'\n\n'}
                      the encryption is strong. but no encryption protects against a provider being compelled, breached, or sharing your data.{'\n\n'}
                      choose your passphrase carefully. we cannot recover it. there is no reset.
                    </Text>
                  </View>
                </NeonCard>
                <TextInput value={backupPassphrase} onChangeText={setBackupPassphrase}
                  placeholder="passphrase…" placeholderTextColor={`rgba(${accentRgb},0.25)`}
                  secureTextEntry autoCapitalize="none"
                  style={[styles.noteInput, { color: theme.text, borderColor: `rgba(${accentRgb},0.2)`, backgroundColor: `rgba(${accentRgb},0.04)` }]} />
                <TextInput value={backupConfirm} onChangeText={setBackupConfirm}
                  placeholder="confirm passphrase…" placeholderTextColor={`rgba(${accentRgb},0.25)`}
                  secureTextEntry autoCapitalize="none"
                  style={[styles.noteInput, { color: theme.text, borderColor: `rgba(${accentRgb},0.2)`, backgroundColor: `rgba(${accentRgb},0.04)` }]} />
                <View style={styles.backupIdleRow}>
                  <TouchableOpacity style={[styles.backupBtn, { borderColor: `rgba(${accentRgb},0.15)`, flex: 0.4 }]}
                    onPress={resetBackup} disabled={backupBusy}>
                    <Text style={[styles.backupBtnText, { color: `rgba(${accentRgb},0.45)` }]}>cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.backupBtn, { borderColor: `rgba(${accentRgb},0.45)`, backgroundColor: `rgba(${accentRgb},0.1)`, flex: 0.6 }]}
                    onPress={handleCreateBackup} disabled={backupBusy}>
                    {backupBusy
                      ? <ActivityIndicator size="small" color={`rgba(${accentRgb},0.8)`} />
                      : <Text style={[styles.backupBtnText, { color: `rgba(${accentRgb},0.9)` }]}>encrypt & export</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {backupMode === 'restore' && pendingBlob && (
              <>
                <Text style={[styles.cardHint, { color: `rgba(${accentRgb},0.7)` }]}>
                  backup file loaded. enter your passphrase to decrypt.
                </Text>
                <TextInput value={backupPassphrase} onChangeText={setBackupPassphrase}
                  placeholder="passphrase…" placeholderTextColor={`rgba(${accentRgb},0.25)`}
                  secureTextEntry autoCapitalize="none"
                  style={[styles.noteInput, { color: theme.text, borderColor: `rgba(${accentRgb},0.2)`, backgroundColor: `rgba(${accentRgb},0.04)` }]} />
                <View style={styles.backupIdleRow}>
                  <TouchableOpacity style={[styles.backupBtn, { borderColor: `rgba(${accentRgb},0.15)`, flex: 0.4 }]}
                    onPress={resetBackup} disabled={backupBusy}>
                    <Text style={[styles.backupBtnText, { color: `rgba(${accentRgb},0.45)` }]}>cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.backupBtn, { borderColor: 'rgba(240,144,96,0.45)', backgroundColor: 'rgba(240,144,96,0.08)', flex: 0.6 }]}
                    onPress={handleRestoreBackup} disabled={backupBusy}>
                    {backupBusy
                      ? <ActivityIndicator size="small" color="rgba(240,144,96,0.8)" />
                      : <Text style={[styles.backupBtnText, { color: 'rgba(240,144,96,0.9)' }]}>decrypt & restore</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {backupMessage && (
              <Text style={[styles.backupMessage, { color: backupMessage.ok ? `rgba(${NEON_RGB.cyan},0.8)` : 'rgba(255,107,107,0.85)' }]}>
                {backupMessage.text}
              </Text>
            )}
          </View>
        </NeonCard>

        {/* ── COMMON QUESTIONS (FAQ) ── */}
        <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)`, marginTop: 24 }]}>
          common questions
        </Text>
        <NeonCard theme={theme} accentRgb={accentRgb} fillIntensity={0.02} borderIntensity={0.1}>
          {FAQ_ITEMS.map((item, i) => {
            const open = openFaq === i;
            return (
              <View
                key={i}
                style={[
                  styles.faqItem,
                  i < FAQ_ITEMS.length - 1 && { borderBottomWidth: 1, borderBottomColor: `rgba(${accentRgb},0.08)` },
                ]}
              >
                <TouchableOpacity
                  style={styles.faqRow}
                  onPress={() => {
                    setOpenFaq(open ? null : i);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.faqQuestion, { color: theme.text }]}>{item.q}</Text>
                  <Text style={[styles.faqChevron, { color: `rgba(${accentRgb},0.5)` }]}>
                    {open ? '∧' : '∨'}
                  </Text>
                </TouchableOpacity>
                {open && (
                  <Text style={[styles.faqAnswer, { color: `${theme.textMuted}cc` }]}>
                    {item.a}
                  </Text>
                )}
              </View>
            );
          })}
        </NeonCard>

        {/* ── BURN RITUAL ── */}
        <Text style={[styles.sectionLabel, { color: 'rgba(224,122,95,0.5)', marginTop: 24 }]}>burn the garden</Text>
        <NeonCard theme={theme} accentRgb="224,122,95" fillIntensity={0.03} borderIntensity={0.18}>
          <View style={styles.burnSection}>
            <Text style={[styles.burnBody, { color: `${theme.textMuted}99` }]}>
              permanently destroy all data. mood logs. journal entries. circadian history.
              all three vaults. no backup. no recovery. the ground returns to zero.
            </Text>
            <HoldToConfirm
              label="hold to ignite"
              holdingLabel="burning..."
              accentRgb="224,122,95"
              duration={3000}
              dangerMode
              onConfirm={() => router.push('/burn')}
            />
          </View>
        </NeonCard>

        <View style={[styles.privacyNote, { borderColor: `rgba(${accentRgb},0.1)` }]}>
          <Text style={[styles.privacyText, { color: `${theme.textMuted}45` }]}>
            zero analytics · no network calls · data never leaves this device
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 8 },
  sectionLabel: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 },
  cardInner: { padding: 16, gap: 12 },
  cardHint: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 0.5, lineHeight: 15 },
  noteInput: { fontFamily: 'CourierPrime', fontSize: 12, borderWidth: 1, borderRadius: 8, padding: 10, minHeight: 52, lineHeight: 18 },

  // ── Privacy header ──
  policyHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  policyIcon: { width: 52, height: 52, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  policyIconText: { fontSize: 24 },
  policyTitle: { fontFamily: 'CourierPrime', fontSize: 24, fontWeight: '700' },
  policySubtitle: { fontFamily: 'CourierPrime', fontSize: 12, marginTop: 2 },
  policyBody: { fontFamily: 'CourierPrime', fontSize: 13, lineHeight: 20 },

  // ── What stays on device ──
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  deviceIcon: { fontSize: 16 },
  deviceItem: { fontFamily: 'CourierPrime', fontSize: 13 },

  // ── Vault rows ──
  vaultRow: { paddingHorizontal: 18, paddingVertical: 14 },
  vaultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  vaultDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  vaultTier: { fontFamily: 'CourierPrime', fontSize: 13, fontWeight: '700' },
  vaultDesc: { fontFamily: 'CourierPrime', fontSize: 11, lineHeight: 16, marginLeft: 14 },
  assuranceInner: { paddingVertical: 14, paddingHorizontal: 18 },
  assuranceText: { fontFamily: 'CourierPrime', fontSize: 11, lineHeight: 18, textAlign: 'center' },

  // ── Your rights ──
  rightsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  rightsIcon: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rightsIconText: { fontSize: 18 },
  rightsLabel: { fontFamily: 'CourierPrime', fontSize: 13, fontWeight: '600' },
  rightsHint: { fontFamily: 'CourierPrime', fontSize: 11, marginTop: 2 },
  rightsBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, minWidth: 72, alignItems: 'center' },
  rightsBtnText: { fontFamily: 'CourierPrime', fontSize: 12, fontWeight: '600' },

  // ── Backup ──
  backupIdleRow: { flexDirection: 'row', gap: 8 },
  backupBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  backupBtnText: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 1.5, textTransform: 'lowercase' },
  backupMessage: { fontFamily: 'CourierPrime', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  warningInner: { padding: 14, gap: 6 },
  warningLabel: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '700' },
  warningText: { fontFamily: 'CourierPrime', fontSize: 11, lineHeight: 17 },

  // ── FAQ ──
  faqItem: {},
  faqRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  faqQuestion: { fontFamily: 'CourierPrime', fontSize: 13, flex: 1, lineHeight: 19 },
  faqChevron: { fontFamily: 'CourierPrime', fontSize: 14, flexShrink: 0 },
  faqAnswer: { fontFamily: 'CourierPrime', fontSize: 12, lineHeight: 19, paddingHorizontal: 16, paddingBottom: 14 },

  // ── Burn ──
  burnSection: { padding: 16, gap: 16 },
  burnBody: { fontFamily: 'CourierPrime', fontSize: 12, lineHeight: 19 },

  // ── Footer ──
  privacyNote: { borderTopWidth: 1, paddingTop: 16, marginTop: 8, alignItems: 'center' },
  privacyText: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1, textAlign: 'center', lineHeight: 16 },
});
