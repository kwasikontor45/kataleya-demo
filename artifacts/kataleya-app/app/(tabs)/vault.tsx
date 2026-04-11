import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Platform, Alert, Keyboard, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCircadian } from '@/hooks/useCircadian';
import { TAB_BAR_HEIGHT } from '@/constants/circadian';
import { Sanctuary } from '@/utils/storage';
import { encryptBackup, decryptBackup, restorePayload, saveAndShareBackup, pickBackupFile } from '@/utils/backup';
import { NeonCard, NEON_RGB } from '@/components/NeonCard';
import { HoldToConfirm } from '@/components/HoldToConfirm';
import { ScanlineLayer } from '@/components/scanline-layer';

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
      setBackupMessage({ text: 'something went wrong. check your passphrase and try again.', ok: false });
    } finally { setBackupBusy(false); }
  };

  const handlePickFile = async () => {
    try {
      const blob = await pickBackupFile();
      if (!blob) return;
      setPendingBlob(blob); setBackupMode('restore');
    } catch (e: unknown) {
      setBackupMessage({ text: 'could not read that file. make sure it is a kataleya backup.', ok: false });
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
            setBackupMessage({ text: 'restore failed. the passphrase may be incorrect or the file may be damaged.', ok: false });
          } finally { setBackupBusy(false); }
        }},
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScanlineLayer />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >


        {/* ── PRIVACY ARCHITECTURE ── */}
        <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)`, marginTop: 24 }]}>privacy architecture</Text>
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
  vaultRow: { paddingHorizontal: 18, paddingVertical: 14 },
  vaultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  vaultDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  vaultTier: { fontFamily: 'CourierPrime', fontSize: 13, fontWeight: '700' },
  vaultDesc: { fontFamily: 'CourierPrime', fontSize: 11, lineHeight: 16, marginLeft: 14 },
  assuranceInner: { paddingVertical: 14, paddingHorizontal: 18 },
  assuranceText: { fontFamily: 'CourierPrime', fontSize: 11, lineHeight: 18, textAlign: 'center' },
  backupIdleRow: { flexDirection: 'row', gap: 8 },
  backupBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  backupBtnText: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 1.5, textTransform: 'lowercase' },
  backupMessage: { fontFamily: 'CourierPrime', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  warningInner: { padding: 14, gap: 6 },
  warningLabel: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '700' },
  warningText: { fontFamily: 'CourierPrime', fontSize: 11, lineHeight: 17 },
  burnSection: { padding: 16, gap: 16 },
  burnBody: { fontFamily: 'CourierPrime', fontSize: 12, lineHeight: 19 },
  burnBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 13, alignItems: 'center' },
  burnBtnText: { fontFamily: 'CourierPrime', fontSize: 12, letterSpacing: 2, textTransform: 'lowercase' },
  privacyNote: { borderTopWidth: 1, paddingTop: 16, marginTop: 8, alignItems: 'center' },
  privacyText: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1, textAlign: 'center', lineHeight: 16 },
});
