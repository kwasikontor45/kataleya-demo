import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Platform,
  Alert,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCircadian } from '@/hooks/useCircadian';
import { TAB_BAR_HEIGHT } from '@/constants/circadian';
import { Sanctuary } from '@/utils/storage';
import {
  encryptBackup,
  decryptBackup,
  restorePayload,
  saveAndShareBackup,
  pickBackupFile,
} from '@/utils/backup';

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const { theme, blend, darkOverride, setDarkOverride } = useCircadian();
  const router = useRouter();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + TAB_BAR_HEIGHT : insets.bottom + TAB_BAR_HEIGHT;

  // ── Backup state ─────────────────────────────────────────────────────────────
  const [backupMode, setBackupMode] = useState<'idle' | 'create' | 'restore'>('idle');
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [backupConfirm, setBackupConfirm] = useState('');
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [pendingBlob, setPendingBlob] = useState<string | null>(null);

  const resetBackup = () => {
    setBackupMode('idle');
    setBackupPassphrase('');
    setBackupConfirm('');
    setBackupMessage(null);
    setPendingBlob(null);
  };

  const handleCreateBackup = async () => {
    if (backupPassphrase.length < 4) {
      setBackupMessage({ text: 'Passphrase must be at least 4 characters.', ok: false });
      return;
    }
    if (backupPassphrase !== backupConfirm) {
      setBackupMessage({ text: 'Passphrases do not match.', ok: false });
      return;
    }
    Keyboard.dismiss();
    setBackupBusy(true);
    setBackupMessage(null);
    try {
      const encrypted = await encryptBackup(backupPassphrase);
      await saveAndShareBackup(encrypted);
      setBackupMessage({ text: 'Backup encrypted and exported.', ok: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetBackup();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Backup failed.';
      setBackupMessage({ text: msg, ok: false });
    } finally {
      setBackupBusy(false);
    }
  };

  const handlePickFile = async () => {
    try {
      const blob = await pickBackupFile();
      if (!blob) return;
      setPendingBlob(blob);
      setBackupMode('restore');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not read backup file.';
      setBackupMessage({ text: msg, ok: false });
    }
  };

  const handleRestoreBackup = async () => {
    if (!pendingBlob || backupPassphrase.length < 1) {
      setBackupMessage({ text: 'Enter the passphrase used when creating the backup.', ok: false });
      return;
    }
    Alert.alert(
      'Replace all data?',
      'This will permanently overwrite your current vaults with the backup. This cannot be undone.',
      [
        { text: 'cancel', style: 'cancel' },
        {
          text: 'restore',
          style: 'destructive',
          onPress: async () => {
            Keyboard.dismiss();
            setBackupBusy(true);
            setBackupMessage(null);
            try {
              const payload = await decryptBackup(pendingBlob!, backupPassphrase);
              await restorePayload(payload);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setBackupMessage({ text: 'Vault restored successfully.', ok: true });
              resetBackup();
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : 'Restore failed.';
              setBackupMessage({ text: msg, ok: false });
            } finally {
              setBackupBusy(false);
            }
          },
        },
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

        {/* ── APPEARANCE ───────────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>appearance</Text>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.appearanceRow}>
            <View style={styles.appearanceText}>
              <Text style={[styles.appearanceLabel, { color: theme.text }]}>force dark mode</Text>
              <Text style={[styles.appearanceHint, { color: theme.textMuted }]}>
                {darkOverride
                  ? `locked to midnight — circadian at ${Math.round(blend * 100)}%`
                  : 'follows circadian rhythm automatically'}
              </Text>
            </View>
            <Switch
              value={darkOverride}
              onValueChange={(v) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDarkOverride(v);
              }}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor={darkOverride ? theme.surface : theme.textMuted}
            />
          </View>
        </View>

        {/* ── PRIVACY ARCHITECTURE ─────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>privacy architecture</Text>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {[
            { tier: 'Fortress',  tech: 'Secure Enclave',  desc: 'Sponsor credentials · OS keychain-backed',        color: '#e8c56a' },
            { tier: 'Sanctuary', tech: '',                  desc: 'Mood · journal · circadian log · Never synced',   color: '#7fc9c9' },
            { tier: 'Surface',   tech: '',                  desc: 'Preferences · sobriety date · Non-sensitive',     color: '#9b6dff' },
          ].map((v, i, arr) => (
            <View
              key={v.tier}
              style={[
                styles.vaultRow,
                i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: `${theme.border}60` },
              ]}
            >
              <View style={styles.vaultHeader}>
                <View style={[styles.vaultDot, { backgroundColor: v.color }]} />
                <Text style={[styles.vaultTier, { color: v.color }]}>{v.tier}</Text>
                {v.tech ? <Text style={[styles.vaultTech, { color: theme.textMuted }]}>{v.tech}</Text> : null}
              </View>
              <Text style={[styles.vaultDesc, { color: theme.textMuted }]}>{v.desc}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.assurance, { backgroundColor: `${theme.success}10`, borderColor: `${theme.success}30` }]}>
          <Text style={[styles.assuranceText, { color: theme.success }]}>
            We are physically unable to access your data.{'\n'}
            There is no server. There is no account. There is no trace.
          </Text>
        </View>

        {/* ── ENCRYPTED BACKUP ─────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 24 }]}>encrypted backup</Text>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardInner}>
            <Text style={[styles.cardHint, { color: theme.textMuted }]}>
              Device-to-device migration. AES-256 encrypted with your passphrase.{'\n'}
              The key never leaves this phone. We see only opaque bytes.
            </Text>

            {backupMode === 'idle' && (
              <View style={styles.backupIdleRow}>
                <TouchableOpacity
                  style={[styles.backupBtn, { borderColor: `${theme.accent}60` }]}
                  onPress={() => { setBackupMessage(null); setBackupMode('create'); }}
                >
                  <Text style={[styles.backupBtnText, { color: theme.accent }]}>create backup</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.backupBtn, { borderColor: `${theme.border}80` }]}
                  onPress={() => { setBackupMessage(null); handlePickFile(); }}
                >
                  <Text style={[styles.backupBtnText, { color: theme.textMuted }]}>restore backup</Text>
                </TouchableOpacity>
              </View>
            )}

            {backupMode === 'create' && (
              <>
                <View style={styles.backupWarning}>
                  <Text style={styles.backupWarningLabel}>before you export</Text>
                  <Text style={styles.backupWarningText}>
                    The encrypted file will leave this device the moment you save or share it. Once it reaches iCloud, Google Drive, or any other destination, it is under that provider's control — not ours, not yours alone.{'\n\n'}
                    The encryption is strong. But no encryption protects against a provider being compelled, breached, or sharing your data without your knowledge. The safest backup is one stored somewhere only you can reach.{'\n\n'}
                    Choose your passphrase carefully. We cannot recover it. There is no reset.
                  </Text>
                </View>
                <TextInput
                  value={backupPassphrase}
                  onChangeText={setBackupPassphrase}
                  placeholder="passphrase…"
                  placeholderTextColor={`${theme.textMuted}60`}
                  secureTextEntry
                  autoCapitalize="none"
                  style={[styles.noteInput, { color: theme.text, borderColor: `${theme.border}60`, backgroundColor: `${theme.bg}80` }]}
                />
                <TextInput
                  value={backupConfirm}
                  onChangeText={setBackupConfirm}
                  placeholder="confirm passphrase…"
                  placeholderTextColor={`${theme.textMuted}60`}
                  secureTextEntry
                  autoCapitalize="none"
                  style={[styles.noteInput, { color: theme.text, borderColor: `${theme.border}60`, backgroundColor: `${theme.bg}80` }]}
                />
                <View style={styles.backupIdleRow}>
                  <TouchableOpacity
                    style={[styles.backupBtn, { borderColor: `${theme.border}50`, flex: 0.4 }]}
                    onPress={resetBackup}
                    disabled={backupBusy}
                  >
                    <Text style={[styles.backupBtnText, { color: theme.textMuted }]}>cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.backupBtn, { borderColor: `${theme.accent}70`, flex: 0.6 }]}
                    onPress={handleCreateBackup}
                    disabled={backupBusy}
                  >
                    {backupBusy
                      ? <ActivityIndicator size="small" color={theme.accent} />
                      : <Text style={[styles.backupBtnText, { color: theme.accent }]}>encrypt & export</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}

            {backupMode === 'restore' && pendingBlob && (
              <>
                <Text style={[styles.cardHint, { color: theme.accent, opacity: 0.8 }]}>
                  Backup file loaded. Enter your passphrase to decrypt.
                </Text>
                <TextInput
                  value={backupPassphrase}
                  onChangeText={setBackupPassphrase}
                  placeholder="passphrase…"
                  placeholderTextColor={`${theme.textMuted}60`}
                  secureTextEntry
                  autoCapitalize="none"
                  style={[styles.noteInput, { color: theme.text, borderColor: `${theme.border}60`, backgroundColor: `${theme.bg}80` }]}
                />
                <View style={styles.backupIdleRow}>
                  <TouchableOpacity
                    style={[styles.backupBtn, { borderColor: `${theme.border}50`, flex: 0.4 }]}
                    onPress={resetBackup}
                    disabled={backupBusy}
                  >
                    <Text style={[styles.backupBtnText, { color: theme.textMuted }]}>cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.backupBtn, { borderColor: '#f0906070', flex: 0.6 }]}
                    onPress={handleRestoreBackup}
                    disabled={backupBusy}
                  >
                    {backupBusy
                      ? <ActivityIndicator size="small" color="#f09060" />
                      : <Text style={[styles.backupBtnText, { color: '#f09060' }]}>decrypt & restore</Text>
                    }
                  </TouchableOpacity>
                </View>
              </>
            )}

            {backupMessage && (
              <Text style={[styles.backupMessage, { color: backupMessage.ok ? theme.success : '#ff6b6b' }]}>
                {backupMessage.text}
              </Text>
            )}
          </View>
        </View>

        {/* ── BURN RITUAL ──────────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: '#ff6b6b80', marginTop: 24 }]}>burn the garden</Text>

        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: '#ff6b6b20' }]}>
          <View style={[styles.burnSection]}>
            <Text style={[styles.burnBody, { color: theme.textMuted }]}>
              Permanently destroy all data. Mood logs. Journal entries. Circadian history.
              All three vaults. No backup. No recovery. The ground returns to zero.
            </Text>
            <TouchableOpacity
              style={[styles.burnBtn, { borderColor: '#ff6b6b40' }]}
              onPress={() => {
                Alert.alert(
                  'Burn everything?',
                  'All mood logs, journal entries, circadian history, and sponsor credentials will be permanently destroyed. This cannot be undone.',
                  [
                    { text: 'keep the garden', style: 'cancel' },
                    {
                      text: 'burn it all',
                      style: 'destructive',
                      onPress: async () => {
                        await Sanctuary.burnAll();
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        router.replace('/onboarding');
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={[styles.burnBtnText, { color: '#ff6b6b60' }]}>initiate burn ritual</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.privacyNote, { borderColor: `${theme.border}60` }]}>
          <Text style={[styles.privacyText, { color: theme.textMuted }]}>
            Zero analytics · No network calls · Data never leaves this device
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 8 },
  sectionLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  card: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  cardInner: { padding: 16, gap: 12 },
  cardHint: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 0.5,
    lineHeight: 15,
    opacity: 0.8,
  },
  noteInput: {
    fontFamily: 'CourierPrime',
    fontSize: 12,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 52,
    lineHeight: 18,
  },

  // Privacy architecture
  vaultRow: { padding: 16 },
  vaultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  vaultDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  vaultTier: { fontFamily: 'CourierPrime', fontSize: 13, fontWeight: '700', flex: 1 },
  vaultTech: { fontFamily: 'CourierPrime', fontSize: 10 },
  vaultDesc: { fontFamily: 'CourierPrime', fontSize: 11, lineHeight: 16, marginLeft: 14 },
  appearanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 },
  appearanceText: { flex: 1, paddingRight: 16 },
  appearanceLabel: { fontFamily: 'CourierPrime-Bold', fontSize: 13, letterSpacing: 0.5 },
  appearanceHint: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 0.5, marginTop: 2 },
  assurance: { borderWidth: 1, borderRadius: 10, padding: 14, marginTop: 4 },
  assuranceText: { fontFamily: 'CourierPrime', fontSize: 11, lineHeight: 18, textAlign: 'center' },

  // Burn
  burnSection: { padding: 16, gap: 16 },
  burnBody: { fontFamily: 'CourierPrime', fontSize: 12, lineHeight: 19 },
  burnBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  burnBtnText: { fontFamily: 'CourierPrime', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },

  // Footer
  privacyNote: { borderTopWidth: 1, paddingTop: 16, marginTop: 8, alignItems: 'center' },
  privacyText: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1, textAlign: 'center', lineHeight: 16 },

  // Backup
  backupIdleRow: { flexDirection: 'row', gap: 8 },
  backupBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  backupBtnText: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'lowercase',
  },
  backupMessage: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  backupWarning: {
    borderWidth: 1,
    borderColor: '#c8941440',
    borderRadius: 8,
    backgroundColor: '#c8941408',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  backupWarningLabel: {
    fontFamily: 'CourierPrime-Bold',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: '#c89414',
    opacity: 0.9,
  },
  backupWarningText: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    lineHeight: 17,
    color: '#c89414',
    opacity: 0.75,
  },
});
