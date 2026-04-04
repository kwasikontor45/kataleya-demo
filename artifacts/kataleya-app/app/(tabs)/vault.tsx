import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Platform, Alert, Keyboard,
  ActivityIndicator, Image, ImageBackground,
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

// ── Asset map — matches HTML image description table ─────────────────────────
// Fortress  → butterfly.jpg  (transformation, recovery, identity)
// Sanctuary → water.gif      (calm, rhythm, local-only)
// Surface   → no image       (plain card — ephemeral, low-stakes)
// Burn      → light.gif      (fiery sun — intensity, warning)
const IMG = {
  butterfly: require('@/assets/images/butterfly.jpg'),  // burn card
  water:     require('@/assets/images/water.gif'),
  light:     require('@/assets/images/light.gif'),
};

// Overlay opacity per vault — darker = more readable text
const OVERLAY = {
  fortress:  'rgba(14,12,20,0.68)',
  sanctuary: 'rgba(14,12,20,0.62)',
  burn:      'rgba(40,8,8,0.72)',
};

function phaseAccentRgb(phase: string): string {
  if (phase === 'goldenHour') return NEON_RGB.violet;
  if (phase === 'night')      return NEON_RGB.amber;
  if (phase === 'dawn')       return NEON_RGB.pink;
  return NEON_RGB.cyan;
}

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const { theme, phase, blend, darkOverride, setDarkOverride } = useCircadian();
  const router = useRouter();
  const accentRgb = phaseAccentRgb(phase);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + TAB_BAR_HEIGHT : insets.bottom + TAB_BAR_HEIGHT;

  const [backupMode, setBackupMode]         = useState<'idle' | 'create' | 'restore'>('idle');
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [backupConfirm, setBackupConfirm]   = useState('');
  const [backupBusy, setBackupBusy]         = useState(false);
  const [backupMessage, setBackupMessage]   = useState<{ text: string; ok: boolean } | null>(null);
  const [pendingBlob, setPendingBlob]       = useState<string | null>(null);

  const resetBackup = () => {
    setBackupMode('idle'); setBackupPassphrase(''); setBackupConfirm('');
    setBackupMessage(null); setPendingBlob(null);
  };

  const handleCreateBackup = async () => {
    if (backupPassphrase.length < 4) {
      setBackupMessage({ text: 'passphrase must be at least 4 characters.', ok: false }); return;
    }
    if (backupPassphrase !== backupConfirm) {
      setBackupMessage({ text: 'passphrases do not match.', ok: false }); return;
    }
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
    Alert.alert(
      'replace all data?',
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

        {/* ── APPEARANCE ── */}
        <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)` }]}>appearance</Text>
        <NeonCard theme={theme} accentRgb={accentRgb}>
          <View style={styles.appearanceRow}>
            <View style={styles.appearanceText}>
              <Text style={[styles.appearanceLabel, { color: theme.text }]}>force dark mode</Text>
              <Text style={[styles.appearanceHint, { color: `${theme.textMuted}80` }]}>
                {darkOverride
                  ? `locked to midnight — circadian at ${Math.round(blend * 100)}%`
                  : 'follows circadian rhythm automatically'}
              </Text>
            </View>
            <Switch
              value={darkOverride}
              onValueChange={(v) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDarkOverride(v); }}
              trackColor={{ false: `rgba(${accentRgb},0.15)`, true: `rgba(${accentRgb},0.6)` }}
              thumbColor={darkOverride ? `rgba(${accentRgb},0.9)` : `${theme.textMuted}80`}
            />
          </View>
        </NeonCard>

        {/* ── PRIVACY ARCHITECTURE — image-backed vault cards ── */}
        <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)`, marginTop: 24 }]}>
          privacy architecture
        </Text>

        {/* FORTRESS — light.gif (intensity, locked away, fire = security) */}
        <ImageBackground
          source={IMG.light}
          style={styles.vaultImgCard}
          imageStyle={styles.vaultImgBg}
          resizeMode="cover"
        >
          <View style={[styles.vaultOverlay, { backgroundColor: OVERLAY.fortress }]}>
            <View style={styles.vaultInner}>
              <View style={styles.vaultTierRow}>
                <View style={[styles.vaultDot, { backgroundColor: `rgba(${NEON_RGB.amber},0.9)` }]} />
                <Text style={[styles.vaultTier, { color: `rgba(${NEON_RGB.amber},0.95)` }]}>FORTRESS</Text>
              </View>
              <Text style={styles.vaultDesc}>
                Hardware-encrypted keys. Sponsor credentials. What even we cannot access.
              </Text>
            </View>
          </View>
        </ImageBackground>

        {/* SANCTUARY — water.gif (calm, local, flowing) */}
        <ImageBackground
          source={IMG.water}
          style={styles.vaultImgCard}
          imageStyle={styles.vaultImgBg}
          resizeMode="cover"
        >
          <View style={[styles.vaultOverlay, { backgroundColor: OVERLAY.sanctuary }]}>
            <View style={styles.vaultInner}>
              <View style={styles.vaultTierRow}>
                <View style={[styles.vaultDot, { backgroundColor: `rgba(${NEON_RGB.cyan},0.9)` }]} />
                <Text style={[styles.vaultTier, { color: `rgba(${NEON_RGB.cyan},0.95)` }]}>SANCTUARY</Text>
              </View>
              <Text style={styles.vaultDesc}>
                Your mood logs, journal entries, circadian history. Local-only. Queryable. Yours.
              </Text>
            </View>
          </View>
        </ImageBackground>

        {/* SURFACE — plain NeonCard (no image — ephemeral, low-stakes) */}
        <NeonCard theme={theme} accentRgb={NEON_RGB.violet} fillIntensity={0.04} borderIntensity={0.14}>
          <View style={styles.vaultInner}>
            <View style={styles.vaultTierRow}>
              <View style={[styles.vaultDot, { backgroundColor: `rgba(${NEON_RGB.violet},0.9)` }]} />
              <Text style={[styles.vaultTier, { color: `rgba(${NEON_RGB.violet},0.95)` }]}>SURFACE</Text>
            </View>
            <Text style={[styles.vaultDesc, { color: `${theme.textMuted}90` }]}>
              Preferences, theme settings, ephemeral state. No sensitive data. Reset anytime.
            </Text>
          </View>
        </NeonCard>

        {/* Privacy assurance */}
        <NeonCard theme={theme} glowColor="cyan" fillIntensity={0.04} borderIntensity={0.16}>
          <View style={styles.assuranceInner}>
            <Text style={[styles.assuranceText, { color: `rgba(${NEON_RGB.cyan},0.7)` }]}>
              we are physically unable to access your data.{'\n'}
              there is no server. there is no account. there is no trace.
            </Text>
          </View>
        </NeonCard>

        {/* ── ENCRYPTED BACKUP ── */}
        <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)`, marginTop: 24 }]}>
          encrypted backup
        </Text>
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
                  onPress={() => { setBackupMessage(null); setBackupMode('create'); }}
                >
                  <Text style={[styles.backupBtnText, { color: `rgba(${accentRgb},0.9)` }]}>create backup</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.backupBtn, { borderColor: `rgba(${accentRgb},0.18)`, backgroundColor: `rgba(${accentRgb},0.04)` }]}
                  onPress={() => { setBackupMessage(null); handlePickFile(); }}
                >
                  <Text style={[styles.backupBtnText, { color: `rgba(${accentRgb},0.55)` }]}>restore backup</Text>
                </TouchableOpacity>
              </View>
            )}

            {backupMode === 'create' && (
              <>
                <NeonCard theme={theme} glowColor="violet" fillIntensity={0.06} borderIntensity={0.25}>
                  <View style={styles.warningInner}>
                    <Text style={[styles.warningLabel, { color: `rgba(${NEON_RGB.violet},0.7)` }]}>before you export</Text>
                    <Text style={[styles.warningText, { color: `rgba(${NEON_RGB.violet},0.6)` }]}>
                      the encrypted file will leave this device the moment you save or share it.{'\n\n'}
                      the encryption is strong. choose your passphrase carefully. we cannot recover it.
                    </Text>
                  </View>
                </NeonCard>
                <TextInput
                  value={backupPassphrase} onChangeText={setBackupPassphrase}
                  placeholder="passphrase…" placeholderTextColor={`rgba(${accentRgb},0.25)`}
                  secureTextEntry autoCapitalize="none"
                  style={[styles.noteInput, { color: theme.text, borderColor: `rgba(${accentRgb},0.2)`, backgroundColor: `rgba(${accentRgb},0.04)` }]}
                />
                <TextInput
                  value={backupConfirm} onChangeText={setBackupConfirm}
                  placeholder="confirm passphrase…" placeholderTextColor={`rgba(${accentRgb},0.25)`}
                  secureTextEntry autoCapitalize="none"
                  style={[styles.noteInput, { color: theme.text, borderColor: `rgba(${accentRgb},0.2)`, backgroundColor: `rgba(${accentRgb},0.04)` }]}
                />
                <View style={styles.backupIdleRow}>
                  <TouchableOpacity
                    style={[styles.backupBtn, { borderColor: `rgba(${accentRgb},0.15)`, flex: 0.4 }]}
                    onPress={resetBackup} disabled={backupBusy}
                  >
                    <Text style={[styles.backupBtnText, { color: `rgba(${accentRgb},0.45)` }]}>cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.backupBtn, { borderColor: `rgba(${accentRgb},0.45)`, backgroundColor: `rgba(${accentRgb},0.1)`, flex: 0.6 }]}
                    onPress={handleCreateBackup} disabled={backupBusy}
                  >
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
                <TextInput
                  value={backupPassphrase} onChangeText={setBackupPassphrase}
                  placeholder="passphrase…" placeholderTextColor={`rgba(${accentRgb},0.25)`}
                  secureTextEntry autoCapitalize="none"
                  style={[styles.noteInput, { color: theme.text, borderColor: `rgba(${accentRgb},0.2)`, backgroundColor: `rgba(${accentRgb},0.04)` }]}
                />
                <View style={styles.backupIdleRow}>
                  <TouchableOpacity
                    style={[styles.backupBtn, { borderColor: `rgba(${accentRgb},0.15)`, flex: 0.4 }]}
                    onPress={resetBackup} disabled={backupBusy}
                  >
                    <Text style={[styles.backupBtnText, { color: `rgba(${accentRgb},0.45)` }]}>cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.backupBtn, { borderColor: 'rgba(224,122,95,0.45)', backgroundColor: 'rgba(224,122,95,0.08)', flex: 0.6 }]}
                    onPress={handleRestoreBackup} disabled={backupBusy}
                  >
                    {backupBusy
                      ? <ActivityIndicator size="small" color="rgba(224,122,95,0.8)" />
                      : <Text style={[styles.backupBtnText, { color: 'rgba(224,122,95,0.9)' }]}>decrypt & restore</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {backupMessage && (
              <Text style={[styles.backupMessage, { color: backupMessage.ok ? `rgba(${NEON_RGB.cyan},0.8)` : 'rgba(224,122,95,0.85)' }]}>
                {backupMessage.text}
              </Text>
            )}
          </View>
        </NeonCard>

        {/* ── BURN THE GARDEN — light.gif background (fiery sun) ── */}
        <Text style={[styles.sectionLabel, { color: 'rgba(224,122,95,0.55)', marginTop: 24 }]}>
          burn the garden
        </Text>

        <ImageBackground
          source={IMG.butterfly}
          style={styles.burnImgCard}
          imageStyle={styles.vaultImgBg}
          resizeMode="cover"
        >
          <View style={[styles.vaultOverlay, { backgroundColor: OVERLAY.burn }]}>
            <View style={styles.burnInner}>
              <Text style={styles.burnEmoji}>🔥</Text>
              <Text style={styles.burnTitle}>Burn the Garden</Text>
              <Text style={styles.burnSubtitle}>
                Cryptographic destruction. No recovery. No trace.
              </Text>
              <HoldToConfirm
                label="hold to ignite"
                holdingLabel="burning..."
                accentRgb="224,122,95"
                duration={3000}
                dangerMode
                onConfirm={() => router.push('/burn')}
                style={styles.burnHoldBtn}
              />
            </View>
          </View>
        </ImageBackground>

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
  sectionLabel: {
    fontFamily: 'CourierPrime',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  // ── Appearance toggle ──────────────────────────────────────────────────────
  appearanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 18 },
  appearanceText: { flex: 1, paddingRight: 16 },
  appearanceLabel: { fontFamily: 'CourierPrime', fontSize: 13, fontWeight: '700', textTransform: 'lowercase' },
  appearanceHint: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 0.5, marginTop: 2 },

  // ── Image-backed vault cards ───────────────────────────────────────────────
  vaultImgCard: {
    width: '100%',
    height: 110,
    borderRadius: 16,
    overflow: 'hidden',
  },
  burnImgCard: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
  },
  vaultImgBg: {
    borderRadius: 16,
  },
  vaultOverlay: {
    flex: 1,
    justifyContent: 'center',
  },
  vaultInner: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 5,
  },
  vaultTierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  vaultDot: { width: 6, height: 6, borderRadius: 3 },
  vaultTier: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
  },
  vaultDesc: {
    fontFamily: 'CourierPrime',
    fontSize: 12,
    color: 'rgba(245,245,245,0.75)',
    lineHeight: 18,
    marginLeft: 14,
  },

  // ── Assurance card ─────────────────────────────────────────────────────────
  assuranceInner: { paddingVertical: 14, paddingHorizontal: 18 },
  assuranceText: { fontFamily: 'CourierPrime', fontSize: 11, lineHeight: 18, textAlign: 'center' },

  // ── Backup section ─────────────────────────────────────────────────────────
  cardInner: { padding: 16, gap: 12 },
  cardHint: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 0.5, lineHeight: 15 },
  noteInput: { fontFamily: 'CourierPrime', fontSize: 12, borderWidth: 1, borderRadius: 8, padding: 10, minHeight: 52, lineHeight: 18 },
  backupIdleRow: { flexDirection: 'row', gap: 8 },
  backupBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  backupBtnText: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 1.5, textTransform: 'lowercase' },
  backupMessage: { fontFamily: 'CourierPrime', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  warningInner: { padding: 14, gap: 6 },
  warningLabel: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '700' },
  warningText: { fontFamily: 'CourierPrime', fontSize: 11, lineHeight: 17 },

  // ── Burn section — image-backed ───────────────────────────────────────────
  burnInner: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    gap: 6,
  },
  burnEmoji: { fontSize: 28 },
  burnTitle: {
    fontFamily: 'CourierPrime',
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(224,122,95,0.95)',
    letterSpacing: 1,
  },
  burnSubtitle: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    color: 'rgba(245,245,245,0.6)',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  burnBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(224,122,95,0.45)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(224,122,95,0.12)',
  },
  burnBtnText: {
    fontFamily: 'CourierPrime',
    fontSize: 11,
    letterSpacing: 2,
    color: 'rgba(224,122,95,0.9)',
    textTransform: 'lowercase',
  },

  // ── Footer ─────────────────────────────────────────────────────────────────
  privacyNote: { borderTopWidth: 1, paddingTop: 16, marginTop: 8, alignItems: 'center' },
  privacyText: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1, textAlign: 'center', lineHeight: 16 },
});
