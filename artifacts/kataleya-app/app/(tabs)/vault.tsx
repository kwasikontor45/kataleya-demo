import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Platform, Alert, Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Rect, Path, Ellipse, G } from 'react-native-svg';
import { useCircadian } from '@/hooks/useCircadian';
import { TAB_BAR_HEIGHT } from '@/constants/circadian';
import { Sanctuary } from '@/utils/storage';
import { encryptBackup, decryptBackup, restorePayload, saveAndShareBackup, pickBackupFile } from '@/utils/backup';
import { NeonCard, NEON_RGB } from '@/components/NeonCard';
import { HoldToConfirm } from '@/components/HoldToConfirm';

function phaseAccentRgb(phase: string): string {
  if (phase === 'goldenHour') return NEON_RGB.violet;
  if (phase === 'night')      return NEON_RGB.amber;
  if (phase === 'dawn')       return NEON_RGB.pink;
  return NEON_RGB.cyan;
}

function FortressCard({ theme }: { theme: any }) {
  return (
    <View style={[styles.illustrationCard, { borderColor: `rgba(${NEON_RGB.amber},0.22)`, backgroundColor: '#16213e' }]}>
      <View style={[styles.accentBar, { backgroundColor: `rgba(${NEON_RGB.amber},0.7)` }]} />
      <View style={styles.cardRow}>
        <View style={styles.artArea}>
          <Svg width={130} height={86} viewBox="0 0 130 86">
            <Circle cx={36} cy={43} r={24} fill="none" stroke="#d4a373" strokeWidth={2} strokeOpacity={0.28}/>
            <Circle cx={36} cy={43} r={16} fill="none" stroke="#d4a373" strokeWidth={1.5} strokeOpacity={0.42}/>
            <Circle cx={36} cy={43} r={6} fill="#d4a373" fillOpacity={0.55}/>
            <Rect x={33} y={47} width={6} height={8} rx={2} fill="#d4a373" fillOpacity={0.55}/>
            <Rect x={56} y={40} width={50} height={5} rx={2.5} fill="#d4a373" fillOpacity={0.72}/>
            <Rect x={76}  y={45} width={5} height={8}  rx={2} fill="#d4a373" fillOpacity={0.62}/>
            <Rect x={87}  y={45} width={5} height={12} rx={2} fill="#d4a373" fillOpacity={0.62}/>
            <Rect x={98}  y={45} width={5} height={6}  rx={2} fill="#d4a373" fillOpacity={0.62}/>
            <Circle cx={42} cy={36} r={22} fill="none" stroke="#d4a373" strokeWidth={1} strokeOpacity={0.1}/>
            <Rect x={60} y={33} width={46} height={4} rx={2} fill="#d4a373" fillOpacity={0.18}/>
          </Svg>
        </View>
        <View style={styles.textArea}>
          <View style={styles.tierRow}>
            <View style={[styles.dot, { backgroundColor: `rgba(${NEON_RGB.amber},0.9)` }]} />
            <Text style={[styles.tierLabel, { color: `rgba(${NEON_RGB.amber},0.9)` }]}>FORTRESS</Text>
          </View>
          <Text style={styles.desc}>Hardware-encrypted keys.</Text>
          <Text style={styles.desc}>Sponsor credentials.</Text>
          <Text style={[styles.descMuted, { color: `${theme.textMuted}75` }]}>What even we cannot access.</Text>
        </View>
      </View>
    </View>
  );
}

function SanctuaryCard({ theme }: { theme: any }) {
  return (
    <View style={[styles.illustrationCard, { borderColor: `rgba(${NEON_RGB.cyan},0.22)`, backgroundColor: '#16213e' }]}>
      <View style={[styles.accentBar, { backgroundColor: `rgba(${NEON_RGB.cyan},0.7)` }]} />
      <View style={styles.cardRow}>
        <View style={styles.artArea}>
          <Svg width={130} height={86} viewBox="0 0 130 86">
            <Circle cx={50} cy={44} r={30} fill="none" stroke="#87a878" strokeWidth={1} strokeOpacity={0.16}/>
            <Circle cx={50} cy={44} r={21} fill="none" stroke="#87a878" strokeWidth={1} strokeOpacity={0.26}/>
            <Circle cx={50} cy={44} r={13} fill="none" stroke="#87a878" strokeWidth={1.5} strokeOpacity={0.44}/>
            <Circle cx={50} cy={44} r={6}  fill="#87a878" fillOpacity={0.32}/>
            <Path d="M18 68 Q34 63 50 68 Q66 73 82 68 Q98 63 112 68"
                  fill="none" stroke="#87a878" strokeWidth={1} strokeOpacity={0.18}/>
            <Path d="M22 76 Q40 71 58 76 Q76 81 94 76"
                  fill="none" stroke="#87a878" strokeWidth={0.8} strokeOpacity={0.1}/>
            <Rect x={96} y={30} width={26} height={20} rx={5} fill="#87a878" fillOpacity={0.08} stroke="#87a878" strokeWidth={1} strokeOpacity={0.38}/>
            <Path d="M101 30 Q101 19 109 19 Q117 19 117 30" fill="none" stroke="#87a878" strokeWidth={1.8} strokeOpacity={0.48}/>
            <Circle cx={109} cy={38} r={3} fill="#87a878" fillOpacity={0.55}/>
            <Rect x={107.5} y={40} width={3} height={5} rx={1.5} fill="#87a878" fillOpacity={0.55}/>
          </Svg>
        </View>
        <View style={styles.textArea}>
          <View style={styles.tierRow}>
            <View style={[styles.dot, { backgroundColor: `rgba(${NEON_RGB.cyan},0.9)` }]} />
            <Text style={[styles.tierLabel, { color: `rgba(${NEON_RGB.cyan},0.9)` }]}>SANCTUARY</Text>
          </View>
          <Text style={styles.desc}>Mood logs, journal entries,</Text>
          <Text style={styles.desc}>circadian history. Local-only.</Text>
          <Text style={[styles.descMuted, { color: `${theme.textMuted}75` }]}>Queryable. Yours.</Text>
        </View>
      </View>
    </View>
  );
}

function SurfaceCard({ theme }: { theme: any }) {
  return (
    <NeonCard theme={theme} accentRgb={NEON_RGB.violet} fillIntensity={0.04} borderIntensity={0.14}>
      <View style={styles.surfaceInner}>
        <View style={styles.tierRow}>
          <View style={[styles.dot, { backgroundColor: `rgba(${NEON_RGB.violet},0.9)` }]} />
          <Text style={[styles.tierLabel, { color: `rgba(${NEON_RGB.violet},0.9)` }]}>SURFACE</Text>
        </View>
        <Text style={[styles.desc, { color: `${theme.textMuted}90` }]}>Preferences, theme settings, ephemeral state.</Text>
        <Text style={[styles.descMuted, { color: `${theme.textMuted}60` }]}>No sensitive data. Reset anytime.</Text>
      </View>
    </NeonCard>
  );
}

function BurnCard({ theme, onIgnite }: { theme: any; onIgnite: () => void }) {
  return (
    <View style={[styles.burnCard, { borderColor: 'rgba(224,122,95,0.25)', backgroundColor: '#16213e' }]}>
      <View style={[styles.accentBar, { backgroundColor: 'rgba(224,122,95,0.7)' }]} />
      <View style={styles.burnRow}>
        <View style={styles.artArea}>
          <Svg width={130} height={120} viewBox="0 0 130 120">
            <Ellipse cx={65} cy={108} rx={34} ry={6} fill="#e07a5f" fillOpacity={0.14}/>
            <Path d="M65 22 Q45 46 41 68 Q37 92 65 98 Q93 92 89 68 Q85 46 65 22Z" fill="#e07a5f" fillOpacity={0.62}/>
            <Path d="M65 42 Q52 58 50 74 Q48 92 65 96 Q82 92 80 74 Q78 58 65 42Z" fill="#f2cc8f" fillOpacity={0.52}/>
            <Ellipse cx={65} cy={92} rx={8} ry={5} fill="#f5f5f5" fillOpacity={0.42}/>
            <Circle cx={42} cy={76} r={1.5} fill="#e07a5f" fillOpacity={0.32}/>
            <Circle cx={90} cy={66} r={1}   fill="#e07a5f" fillOpacity={0.22}/>
            <Circle cx={36} cy={88} r={1}   fill="#f2cc8f" fillOpacity={0.22}/>
            <Circle cx={94} cy={82} r={1.5} fill="#f2cc8f" fillOpacity={0.28}/>
            <Path d="M58 21 Q53 10 59 3"  fill="none" stroke="rgba(245,245,245,0.07)" strokeWidth={2} strokeLinecap="round"/>
            <Path d="M72 23 Q78 11 74 4"  fill="none" stroke="rgba(245,245,245,0.05)" strokeWidth={1.5} strokeLinecap="round"/>
          </Svg>
        </View>
        <View style={[styles.textArea, { gap: 5 }]}>
          <View style={styles.tierRow}>
            <View style={[styles.dot, { backgroundColor: 'rgba(224,122,95,0.9)' }]} />
            <Text style={[styles.tierLabel, { color: 'rgba(224,122,95,0.9)' }]}>BURN THE GARDEN</Text>
          </View>
          <Text style={styles.desc}>Cryptographic destruction.</Text>
          <Text style={[styles.descMuted, { color: `${theme.textMuted}70` }]}>No recovery. No trace.</Text>
          <HoldToConfirm
            label="hold to ignite"
            holdingLabel="burning..."
            accentRgb="224,122,95"
            duration={3000}
            dangerMode
            onConfirm={onIgnite}
            style={{ marginTop: 4 }}
          />
        </View>
      </View>
    </View>
  );
}

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const { theme, phase, blend, darkOverride, setDarkOverride } = useCircadian();
  const router = useRouter();
  const accentRgb = phaseAccentRgb(phase);
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + TAB_BAR_HEIGHT : insets.bottom + TAB_BAR_HEIGHT;

  const [backupMode, setBackupMode]             = useState<'idle' | 'create' | 'restore'>('idle');
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [backupConfirm, setBackupConfirm]       = useState('');
  const [backupBusy, setBackupBusy]             = useState(false);
  const [backupMessage, setBackupMessage]       = useState<{ text: string; ok: boolean } | null>(null);
  const [pendingBlob, setPendingBlob]           = useState<string | null>(null);

  const resetBackup = () => { setBackupMode('idle'); setBackupPassphrase(''); setBackupConfirm(''); setBackupMessage(null); setPendingBlob(null); };

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
    } catch (e: unknown) { setBackupMessage({ text: e instanceof Error ? e.message : 'could not read backup file.', ok: false }); }
  };

  const handleRestoreBackup = async () => {
    if (!pendingBlob || backupPassphrase.length < 1) { setBackupMessage({ text: 'enter the passphrase used when creating the backup.', ok: false }); return; }
    Alert.alert('replace all data?', 'this will permanently overwrite your current vaults with the backup. this cannot be undone.', [
      { text: 'cancel', style: 'cancel' },
      { text: 'restore', style: 'destructive', onPress: async () => {
        Keyboard.dismiss(); setBackupBusy(true); setBackupMessage(null);
        try {
          const payload = await decryptBackup(pendingBlob!, backupPassphrase);
          await restorePayload(payload);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setBackupMessage({ text: 'vault restored successfully.', ok: true });
          resetBackup();
        } catch (e: unknown) { setBackupMessage({ text: e instanceof Error ? e.message : 'restore failed.', ok: false }); }
        finally { setBackupBusy(false); }
      }},
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)` }]}>appearance</Text>
        <NeonCard theme={theme} accentRgb={accentRgb}>
          <View style={styles.appearanceRow}>
            <View style={styles.appearanceText}>
              <Text style={[styles.appearanceLabel, { color: theme.text }]}>force dark mode</Text>
              <Text style={[styles.appearanceHint, { color: `${theme.textMuted}80` }]}>
                {darkOverride ? `locked to midnight — circadian at ${Math.round(blend * 100)}%` : 'follows circadian rhythm automatically'}
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

        <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)`, marginTop: 24 }]}>privacy architecture</Text>
        <FortressCard theme={theme} />
        <SanctuaryCard theme={theme} />
        <SurfaceCard theme={theme} />
        <NeonCard theme={theme} glowColor="cyan" fillIntensity={0.04} borderIntensity={0.16}>
          <View style={styles.assuranceInner}>
            <Text style={[styles.assuranceText, { color: `rgba(${NEON_RGB.cyan},0.7)` }]}>
              we are physically unable to access your data.{'\n'}there is no server. there is no account. there is no trace.
            </Text>
          </View>
        </NeonCard>

        <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)`, marginTop: 24 }]}>encrypted backup</Text>
        <NeonCard theme={theme} accentRgb={accentRgb}>
          <View style={styles.cardInner}>
            <Text style={[styles.cardHint, { color: `${theme.textMuted}80` }]}>
              device-to-device migration. AES-256 encrypted with your passphrase.{'\n'}the key never leaves this phone. we see only opaque bytes.
            </Text>
            {backupMode === 'idle' && (
              <View style={styles.backupIdleRow}>
                <TouchableOpacity style={[styles.backupBtn, { borderColor: `rgba(${accentRgb},0.45)`, backgroundColor: `rgba(${accentRgb},0.08)` }]} onPress={() => { setBackupMessage(null); setBackupMode('create'); }}>
                  <Text style={[styles.backupBtnText, { color: `rgba(${accentRgb},0.9)` }]}>create backup</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.backupBtn, { borderColor: `rgba(${accentRgb},0.18)`, backgroundColor: `rgba(${accentRgb},0.04)` }]} onPress={() => { setBackupMessage(null); handlePickFile(); }}>
                  <Text style={[styles.backupBtnText, { color: `rgba(${accentRgb},0.55)` }]}>restore backup</Text>
                </TouchableOpacity>
              </View>
            )}
            {backupMode === 'create' && (
              <>
                <NeonCard theme={theme} glowColor="violet" fillIntensity={0.06} borderIntensity={0.25}>
                  <View style={styles.warningInner}>
                    <Text style={[styles.warningLabel, { color: `rgba(${NEON_RGB.violet},0.7)` }]}>before you export</Text>
                    <Text style={[styles.warningText, { color: `rgba(${NEON_RGB.violet},0.6)` }]}>the encrypted file leaves this device the moment you save or share it.{'\n\n'}choose your passphrase carefully. we cannot recover it.</Text>
                  </View>
                </NeonCard>
                <TextInput value={backupPassphrase} onChangeText={setBackupPassphrase} placeholder="passphrase…" placeholderTextColor={`rgba(${accentRgb},0.25)`} secureTextEntry autoCapitalize="none" style={[styles.noteInput, { color: theme.text, borderColor: `rgba(${accentRgb},0.2)`, backgroundColor: `rgba(${accentRgb},0.04)` }]}/>
                <TextInput value={backupConfirm} onChangeText={setBackupConfirm} placeholder="confirm passphrase…" placeholderTextColor={`rgba(${accentRgb},0.25)`} secureTextEntry autoCapitalize="none" style={[styles.noteInput, { color: theme.text, borderColor: `rgba(${accentRgb},0.2)`, backgroundColor: `rgba(${accentRgb},0.04)` }]}/>
                <View style={styles.backupIdleRow}>
                  <TouchableOpacity style={[styles.backupBtn, { borderColor: `rgba(${accentRgb},0.15)`, flex: 0.4 }]} onPress={resetBackup} disabled={backupBusy}><Text style={[styles.backupBtnText, { color: `rgba(${accentRgb},0.45)` }]}>cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.backupBtn, { borderColor: `rgba(${accentRgb},0.45)`, backgroundColor: `rgba(${accentRgb},0.1)`, flex: 0.6 }]} onPress={handleCreateBackup} disabled={backupBusy}>
                    {backupBusy ? <ActivityIndicator size="small" color={`rgba(${accentRgb},0.8)`}/> : <Text style={[styles.backupBtnText, { color: `rgba(${accentRgb},0.9)` }]}>encrypt & export</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
            {backupMode === 'restore' && pendingBlob && (
              <>
                <Text style={[styles.cardHint, { color: `rgba(${accentRgb},0.7)` }]}>backup file loaded. enter your passphrase to decrypt.</Text>
                <TextInput value={backupPassphrase} onChangeText={setBackupPassphrase} placeholder="passphrase…" placeholderTextColor={`rgba(${accentRgb},0.25)`} secureTextEntry autoCapitalize="none" style={[styles.noteInput, { color: theme.text, borderColor: `rgba(${accentRgb},0.2)`, backgroundColor: `rgba(${accentRgb},0.04)` }]}/>
                <View style={styles.backupIdleRow}>
                  <TouchableOpacity style={[styles.backupBtn, { borderColor: `rgba(${accentRgb},0.15)`, flex: 0.4 }]} onPress={resetBackup} disabled={backupBusy}><Text style={[styles.backupBtnText, { color: `rgba(${accentRgb},0.45)` }]}>cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.backupBtn, { borderColor: 'rgba(224,122,95,0.45)', backgroundColor: 'rgba(224,122,95,0.08)', flex: 0.6 }]} onPress={handleRestoreBackup} disabled={backupBusy}>
                    {backupBusy ? <ActivityIndicator size="small" color="rgba(224,122,95,0.8)"/> : <Text style={[styles.backupBtnText, { color: 'rgba(224,122,95,0.9)' }]}>decrypt & restore</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
            {backupMessage && <Text style={[styles.backupMessage, { color: backupMessage.ok ? `rgba(${NEON_RGB.cyan},0.8)` : 'rgba(224,122,95,0.85)' }]}>{backupMessage.text}</Text>}
          </View>
        </NeonCard>

        <Text style={[styles.sectionLabel, { color: 'rgba(224,122,95,0.5)', marginTop: 24 }]}>burn the garden</Text>
        <BurnCard theme={theme} onIgnite={() => router.push('/burn')} />

        <View style={[styles.privacyNote, { borderColor: `rgba(${accentRgb},0.1)` }]}>
          <Text style={[styles.privacyText, { color: `${theme.textMuted}45` }]}>zero analytics · no network calls · data never leaves this device</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 8 },
  sectionLabel: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 },
  illustrationCard: { width: '100%', borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  burnCard: { width: '100%', borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  accentBar: { height: 3, width: '100%' },
  cardRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingRight: 16 },
  burnRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingRight: 16 },
  artArea: { width: 130, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  textArea: { flex: 1, gap: 4 },
  surfaceInner: { padding: 16, gap: 5 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  tierLabel: { fontFamily: 'CourierPrime', fontSize: 10, fontWeight: '700', letterSpacing: 2.5 },
  desc: { fontFamily: 'CourierPrime', fontSize: 12, color: 'rgba(245,245,245,0.78)', lineHeight: 18 },
  descMuted: { fontFamily: 'CourierPrime', fontSize: 11, lineHeight: 17, marginTop: 2 },
  appearanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 18 },
  appearanceText: { flex: 1, paddingRight: 16 },
  appearanceLabel: { fontFamily: 'CourierPrime', fontSize: 13, fontWeight: '700', textTransform: 'lowercase' },
  appearanceHint: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 0.5, marginTop: 2 },
  assuranceInner: { paddingVertical: 14, paddingHorizontal: 18 },
  assuranceText: { fontFamily: 'CourierPrime', fontSize: 11, lineHeight: 18, textAlign: 'center' },
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
  privacyNote: { borderTopWidth: 1, paddingTop: 16, marginTop: 8, alignItems: 'center' },
  privacyText: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1, textAlign: 'center', lineHeight: 16 },
});
