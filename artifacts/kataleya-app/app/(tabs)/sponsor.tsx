import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Pressable, Animated, Platform, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useCircadian } from '@/hooks/useCircadian';
import { TAB_BAR_HEIGHT } from '@/constants/circadian';
import { useSponsorChannel } from '@/hooks/useSponsorChannel';
import { WaterVisual, LightVisual, WaterBanner, LightBanner, WaterFlood, LightBloom } from '@/components/SignalIcons';
import { sponsorWater, sponsorLight } from '@/utils/hapticBloom';
import type { PresenceLogEntry } from '@/hooks/useSponsorChannel';
import { NeonCard, NEON_RGB } from '@/components/NeonCard';
import { TypewriterText } from '@/components/typewriter-text';
import * as Sharing from 'expo-sharing';

type RoleChoice = 'user' | 'sponsor' | null;

const WATER_RGB = NEON_RGB.cyan;    // 127,201,201
const LIGHT_RGB = NEON_RGB.amber;   // 232,197,106
const DANGER_RGB = '255,107,107';

function phaseAccentRgb(phase: string): string {
  if (phase === 'goldenHour') return NEON_RGB.amber;
  if (phase === 'night')      return NEON_RGB.violet;
  if (phase === 'dawn')       return NEON_RGB.pink;
  return NEON_RGB.cyan;
}

function CodeInput({ value, onChange, theme, accentRgb }: {
  value: string; onChange: (v: string) => void; theme: any; accentRgb: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={t => onChange(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
      placeholder="XXXXXX"
      placeholderTextColor={`rgba(${accentRgb},0.3)`}
      autoCapitalize="characters"
      autoCorrect={false}
      maxLength={6}
      returnKeyType="done"
      style={[styles.codeInput, {
        color: `rgba(${accentRgb},0.95)`,
        borderColor: value.length === 6 ? `rgba(${accentRgb},0.6)` : `rgba(${accentRgb},0.2)`,
        backgroundColor: `rgba(${accentRgb},0.05)`,
      }]}
    />
  );
}

function HoldButton({
  label, sublabel, colorRgb, onFire, disabled, theme, visual, holdDuration = 2000, bgOverlay,
}: {
  label: string; sublabel: string; colorRgb: string; onFire: () => void;
  disabled?: boolean; theme: any; visual?: React.ReactNode; holdDuration?: number;
  bgOverlay?: React.ReactNode;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const [holding, setHolding] = useState(false);
  const [fired, setFired] = useState(false);
  const imgOpacity = useRef(new Animated.Value(0)).current;

  const begin = useCallback(() => {
    if (disabled || fired) return;
    setHolding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Fade in background image
    Animated.timing(imgOpacity, { toValue: 0.28, duration: 600, useNativeDriver: true }).start();
    animRef.current = Animated.timing(progress, { toValue: 1, duration: holdDuration, useNativeDriver: false });
    animRef.current.start(({ finished }) => {
      if (finished) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onFire(); setFired(true); setHolding(false);
        // Keep image visible briefly after fire, then fade
        setTimeout(() => {
          Animated.timing(imgOpacity, { toValue: 0, duration: 800, useNativeDriver: true }).start();
          setFired(false);
          Animated.timing(progress, { toValue: 0, duration: 400, useNativeDriver: false }).start();
        }, 3000);
      }
    });
  }, [disabled, fired, onFire, progress, holdDuration, imgOpacity]);

  const cancel = useCallback(() => {
    if (fired) return;
    setHolding(false); animRef.current?.stop();
    Animated.timing(imgOpacity, { toValue: 0, duration: 400, useNativeDriver: true }).start();
    Animated.timing(progress, { toValue: 0, duration: 300, useNativeDriver: false }).start();
  }, [fired, progress, imgOpacity]);

  const fill = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const active = fired || holding;

  return (
    <Pressable
      onPressIn={begin}
      onPressOut={cancel}
      style={[
        styles.holdBtn,
        {
          borderColor: `rgba(${colorRgb},${active ? 0.55 : 0.2})`,
          backgroundColor: `rgba(${colorRgb},${active ? 0.1 : 0.05})`,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <View style={styles.holdBtnInner}>
        {bgOverlay && (
          <Animated.View style={[styles.holdBgImage, { opacity: imgOpacity }]}>
            {bgOverlay}
          </Animated.View>
        )}
        <Animated.View style={[styles.holdFill, { width: fill, backgroundColor: `rgba(${colorRgb},0.15)` }]} />
        <View style={styles.holdBtnContent}>
          {visual && !fired && (
            <View style={styles.holdBtnVisual} pointerEvents="none">{visual}</View>
          )}
          <Text style={[styles.holdBtnLabel, { color: `rgba(${colorRgb},${active ? 1 : 0.75})` }]}>
            {fired ? `${label} sent` : label}
          </Text>
          <Text style={[styles.holdBtnSub, { color: `rgba(${colorRgb},${active ? 0.65 : 0.4})` }]}>
            {fired ? 'received on their device' : holding ? 'keep holding…' : sublabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function IncomingSignalBanner({ type, count, latestTs, onDismiss, theme }: {
  type: 'water' | 'light'; count: number; latestTs: number;
  onDismiss: (type: 'water' | 'light') => void; theme: any;
}) {
  const colorRgb = type === 'water' ? WATER_RGB : LIGHT_RGB;
  const label = type === 'water' ? '〰 water' : '· light';
  let qualityLabel: string;
  if (type === 'water') {
    if (count >= 4)       qualityLabel = 'deep, sustained · waters in succession';
    else if (count >= 2)  qualityLabel = 'deeper ripples · waters received';
    else                  qualityLabel = 'ripples from them';
  } else {
    if (count >= 4)       qualityLabel = 'held in warmth · lights in succession';
    else if (count >= 2)  qualityLabel = 'warmth sustained · lights received';
    else                  qualityLabel = 'warm light from them';
  }
  return (
    <TouchableOpacity onPress={() => onDismiss(type)}
      style={[styles.signalBanner, { backgroundColor: `rgba(${colorRgb},0.08)`, borderColor: `rgba(${colorRgb},0.3)` }]}>
      <View style={styles.signalIconWrap}>
        {type === 'water' ? <WaterBanner color={`rgba(${colorRgb},0.85)`} /> : <LightBanner color={`rgba(${colorRgb},0.85)`} />}
      </View>
      <View style={styles.signalText}>
        <Text style={[styles.signalLabel, { color: `rgba(${colorRgb},0.9)` }]}>{label}{count > 1 ? ` ×${count}` : ''}</Text>
        <Text style={[styles.signalFrom, { color: `${theme.textMuted}cc` }]}>{qualityLabel}</Text>
        <Text style={[styles.signalFrom, { color: `${theme.textMuted}70` }]}>{formatSignalTime(latestTs)} · tap to clear</Text>
      </View>
    </TouchableOpacity>
  );
}

function RainbowBanner({ theme, onDismiss }: { theme: any; onDismiss: () => void }) {
  const colors = ['127,201,201', '160,208,144', '232,197,106', '240,144,96', '192,144,128'];
  return (
    <TouchableOpacity onPress={onDismiss}
      style={[styles.signalBanner, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.18)' }]}>
      <View style={styles.rainbowDots}>
        {colors.map((c, i) => <View key={i} style={[styles.rainbowDot, { backgroundColor: `rgba(${c},0.8)` }]} />)}
      </View>
      <View style={styles.signalText}>
        <Text style={[styles.signalLabel, { color: `rgba(${LIGHT_RGB},0.9)` }]}>the garden opens</Text>
        <Text style={[styles.signalFrom, { color: `${theme.textMuted}cc` }]}>water and light together · prism through the garden</Text>
        <Text style={[styles.signalFrom, { color: `${theme.textMuted}70` }]}>tap to clear</Text>
      </View>
    </TouchableOpacity>
  );
}

function formatSignalTime(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `today · ${time}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` · ${time}`;
}

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

function GardenPath({ log, theme, accentRgb, onClear }: {
  log: PresenceLogEntry[]; theme: any; accentRgb: string; onClear: (type?: 'water' | 'light') => void;
}) {
  const now = Date.now();
  const visible = log.filter(e => now - e.timestamp < TWENTY_FOUR_HOURS).slice(-30).sort((a, b) => a.timestamp - b.timestamp);
  const waterCount = visible.filter(e => e.type === 'water').length;
  const lightCount = visible.filter(e => e.type === 'light').length;

  return (
    <NeonCard theme={theme} accentRgb={accentRgb} fillIntensity={0.04} borderIntensity={0.14}>
      <View style={styles.cardInner}>
        <Text style={[styles.hint, { color: `rgba(${accentRgb},0.4)` }]}>footprints in the garden · fades in 24 hours</Text>
        <View style={styles.gardenPath}>
          {visible.map(entry => {
            const age = now - entry.timestamp;
            const opacity = Math.max(0.1, 1 - age / TWENTY_FOUR_HOURS);
            const size = entry.type === 'water' ? 10 : 8;
            const rgb = entry.type === 'water' ? WATER_RGB : LIGHT_RGB;
            return (
              <View key={entry.id} style={[styles.gardenDot, { width: size, height: size, borderRadius: size / 2, backgroundColor: `rgba(${rgb},${opacity})` }]} />
            );
          })}
          {visible.length === 0 && <Text style={[styles.hint, { color: `rgba(${accentRgb},0.3)` }]}>the path is empty</Text>}
        </View>
        <View style={styles.gardenCounts}>
          {waterCount > 0 && (
            <View style={styles.gardenCountItem}>
              <Text style={[styles.gardenCountNum, { color: `rgba(${WATER_RGB},0.9)` }]}>{waterCount}</Text>
              <Text style={[styles.gardenCountLabel, { color: `rgba(${WATER_RGB},0.5)` }]}>〰 water</Text>
            </View>
          )}
          {lightCount > 0 && (
            <View style={styles.gardenCountItem}>
              <Text style={[styles.gardenCountNum, { color: `rgba(${LIGHT_RGB},0.9)` }]}>{lightCount}</Text>
              <Text style={[styles.gardenCountLabel, { color: `rgba(${LIGHT_RGB},0.5)` }]}>· light</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => onClear()} style={{ marginLeft: 'auto' as any }}>
            <Text style={[styles.clearText, { color: `rgba(${accentRgb},0.35)` }]}>clear</Text>
          </TouchableOpacity>
        </View>
      </View>
    </NeonCard>
  );
}

export default function SponsorScreen() {
  const insets = useSafeAreaInsets();
  const { theme, phase } = useCircadian();
  const accentRgb = phaseAccentRgb(phase);
  const {
    role, connState, inviteCode, status, incomingSignals, presenceLog,
    messages, hasPeerKey, error, createInvite, acceptInvite, sendPresence,
    sendMessage, sendCheckIn, disconnect, dismissSignalsByType, clearPresenceLog,
    deleteMessage, clearMessages, isConnected,
  } = useSponsorChannel();

  const [firstImpression, setFirstImpression] = useState(true);
  const [sponsorName, setSponsorName] = useState('');
  const [roleChoice, setRoleChoice] = useState<RoleChoice>(null);
  const [proximity, setProximity] = useState<'together' | 'remote' | null>(null);
  const [relayOpen, setRelayOpen] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [checkedInDate, setCheckedInDate] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [sentSignalLog, setSentSignalLog] = useState<{ type: 'water' | 'light'; ts: number }[]>([]);
  const [rainbowActive, setRainbowActive] = useState(false);
  const rainbowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const threadScrollRef = useRef<ScrollView>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + TAB_BAR_HEIGHT : insets.bottom + TAB_BAR_HEIGHT;
  const today = new Date().toDateString();
  const checkedInToday = checkedIn && checkedInDate === today;

  useEffect(() => {
    if (chatOpen && messages.length > 0) {
      setTimeout(() => threadScrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length, chatOpen]);

  useEffect(() => { if (status) { setCheckedIn(status.checkedIn); setCheckedInDate(status.checkedInDate); } }, [status]);
  useEffect(() => { if (isConnected && role) setRoleChoice(role); }, [isConnected, role]);
  useEffect(() => { if (isConnected) setFirstImpression(false); }, [isConnected]);

  const firedSignalIds = useRef(new Set<string>());
  useEffect(() => {
    for (const signal of incomingSignals) {
      if (!firedSignalIds.current.has(signal.id)) {
        firedSignalIds.current.add(signal.id);
        if (signal.type === 'water') sponsorWater();
        if (signal.type === 'light') sponsorLight();
      }
    }
  }, [incomingSignals]);

  const handleCreateInvite = async () => { setCreating(true); await createInvite(); setCreating(false); };
  const handleShareCode = async (code: string) => {
    try {
      const msg = `my kataleya invite code: ${code}\n\nopen sponsor tab → i am the sponsor → enter this code. expires in 48 hours.`;
      if (await Sharing.isAvailableAsync()) {
        const EFS = await import('expo-file-system');
        const uri = EFS.default.cacheDirectory + 'kataleya-invite.txt';
        await EFS.default.writeAsStringAsync(uri, msg);
        await Sharing.shareAsync(uri, { mimeType: 'text/plain', dialogTitle: 'share invite code' });
      }
    } catch (e) { console.error('share failed', e); }
  };

  const handleAccept = async () => {
    if (codeInput.length < 6) return;
    Keyboard.dismiss(); setAccepting(true); await acceptInvite(codeInput); setAccepting(false);
  };
  const handleCheckIn = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newState = !checkedInToday;
    setCheckedIn(newState); setCheckedInDate(newState ? today : null);
    if (newState) await sendCheckIn();
  };
  const handleDisconnect = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await disconnect();
    setRoleChoice(null); setCodeInput(''); setCheckedIn(false);
    setCheckedInDate(null); setMessageInput(''); setSentSignalLog([]);
    setRainbowActive(false);
    if (rainbowTimer.current) clearTimeout(rainbowTimer.current);
  };
  const handleSendPresence = (type: 'water' | 'light') => {
    sendPresence(type);
    const now = Date.now();
    setSentSignalLog(prev => {
      const next = [...prev.filter(s => now - s.ts < 90_000), { type, ts: now }];
      const opposite = type === 'water' ? 'light' : 'water';
      const hasOpposite = next.some(s => s.type === opposite && now - s.ts < 60_000);
      if (hasOpposite && !rainbowActive) {
        setRainbowActive(true);
        if (rainbowTimer.current) clearTimeout(rainbowTimer.current);
        rainbowTimer.current = setTimeout(() => setRainbowActive(false), 45_000);
      }
      return next;
    });
  };
  const handleSendMessage = async () => {
    if (!messageInput.trim() || sendingMsg) return;
    Keyboard.dismiss(); setSendingMsg(true);
    await sendMessage(messageInput); setMessageInput(''); setSendingMsg(false);
  };

  const effectiveRole = isConnected ? role : roleChoice;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      >
        {/* Incoming signal banners */}
        {(['water', 'light'] as const).map(type => {
          const group = incomingSignals.filter(s => s.type === type);
          if (!group.length) return null;
          return (
            <IncomingSignalBanner key={type} type={type} count={group.length}
              latestTs={Math.max(...group.map(s => s.timestamp))}
              onDismiss={dismissSignalsByType} theme={theme} />
          );
        })}
        {rainbowActive && <RainbowBanner theme={theme} onDismiss={() => setRainbowActive(false)} />}

        <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)` }]}>sponsor presence</Text>

        {/* ── FIRST IMPRESSION — types in, name field appears, then opens the flow ── */}
        {firstImpression && !isConnected && (
          <View style={styles.firstImpressionWrap}>
            <TypewriterText
              text="who do you reach for at 2am?"
              speed={42}
              jitter={22}
              startDelay={400}
              style={[styles.firstImpressionQ, { color: theme.text }]}
            />
            <TextInput
              value={sponsorName}
              onChangeText={setSponsorName}
              placeholder="their name"
              placeholderTextColor={`rgba(${accentRgb},0.25)`}
              returnKeyType="done"
              autoCorrect={false}
              onSubmitEditing={() => {
                if (sponsorName.trim()) {
                  Keyboard.dismiss();
                  setFirstImpression(false);
                }
              }}
              style={[styles.firstImpressionInput, {
                color: theme.text,
                borderColor: sponsorName.trim()
                  ? `rgba(${accentRgb},0.45)`
                  : `rgba(${accentRgb},0.12)`,
                backgroundColor: `rgba(${accentRgb},0.04)`,
              }]}
            />
            {sponsorName.trim().length > 0 && (
              <TouchableOpacity
                style={[styles.firstImpressionCta, {
                  borderColor: `rgba(${accentRgb},0.35)`,
                  backgroundColor: `rgba(${accentRgb},0.07)`,
                }]}
                onPress={() => { Keyboard.dismiss(); setFirstImpression(false); }}
              >
                <Text style={[styles.firstImpressionCtaText, { color: `rgba(${accentRgb},0.85)` }]}>
                  reach out →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── ROLE PICKER ── */}
        {!isConnected && !roleChoice && !firstImpression && (
          <NeonCard theme={theme} accentRgb={accentRgb}>
            <View style={styles.cardInner}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>who are you in this session?</Text>
              <Text style={[styles.cardBody, { color: `${theme.textMuted}cc` }]}>
                one device is the person in recovery.{'\n'}the other is their sponsor.
              </Text>
              <View style={styles.roleRow}>
                <TouchableOpacity
                  style={[styles.roleBtn, { borderColor: `rgba(${accentRgb},0.45)`, backgroundColor: `rgba(${accentRgb},0.08)` }]}
                  onPress={() => setRoleChoice('user')}>
                  <Text style={[styles.roleBtnTitle, { color: `rgba(${accentRgb},0.9)` }]}>i am in recovery</Text>
                  <Text style={[styles.roleBtnSub, { color: `rgba(${accentRgb},0.45)` }]}>generate invite code</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleBtn, { borderColor: `rgba(${accentRgb},0.15)`, backgroundColor: `rgba(${accentRgb},0.04)` }]}
                  onPress={() => setRoleChoice('sponsor')}>
                  <Text style={[styles.roleBtnTitle, { color: `${theme.text}cc` }]}>i am the sponsor</Text>
                  <Text style={[styles.roleBtnSub, { color: `${theme.textMuted}99` }]}>enter invite code</Text>
                </TouchableOpacity>
              </View>
            </View>
          </NeonCard>
        )}

        {/* ── USER: PROXIMITY CHOICE ── */}
        {!isConnected && effectiveRole === 'user' && connState !== 'inviting' && !proximity && (
          <NeonCard theme={theme} accentRgb={accentRgb}>
            <View style={styles.cardInner}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>invite your sponsor</Text>
              <Text style={[styles.cardBody, { color: `${theme.textMuted}cc` }]}>
                are you with them right now, or are they somewhere else?
              </Text>
              <View style={styles.roleRow}>
                <TouchableOpacity
                  style={[styles.roleBtn, { borderColor: `rgba(${accentRgb},0.45)`, backgroundColor: `rgba(${accentRgb},0.08)` }]}
                  onPress={() => setProximity('together')}>
                  <Text style={[styles.roleBtnTitle, { color: `rgba(${accentRgb},0.9)` }]}>we’re together</Text>
                  <Text style={[styles.roleBtnSub, { color: `rgba(${accentRgb},0.45)` }]}>same room</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleBtn, { borderColor: `rgba(${accentRgb},0.18)`, backgroundColor: `rgba(${accentRgb},0.04)` }]}
                  onPress={() => setProximity('remote')}>
                  <Text style={[styles.roleBtnTitle, { color: `${theme.text}cc` }]}>they’re remote</Text>
                  <Text style={[styles.roleBtnSub, { color: `${theme.textMuted}99` }]}>miles away</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setRoleChoice(null)}>
                <Text style={[styles.backLink, { color: `rgba(${accentRgb},0.35)` }]}>← back</Text>
              </TouchableOpacity>
            </View>
          </NeonCard>
        )}

        {/* ── TOGETHER — large code to show/photograph ── */}
        {!isConnected && effectiveRole === 'user' && connState !== 'inviting' && proximity === 'together' && (
          <NeonCard theme={theme} accentRgb={accentRgb}>
            <View style={styles.cardInner}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>show your sponsor this screen</Text>
              <Text style={[styles.cardBody, { color: `${theme.textMuted}cc` }]}>
                hand them your phone or hold it toward them.{'\n'}they enter this code on their device.
              </Text>
              {error && <Text style={[styles.errorText, { color: `rgba(${DANGER_RGB},0.9)` }]}>{error}</Text>}
              {!inviteCode ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, { borderColor: `rgba(${accentRgb},0.45)`, backgroundColor: `rgba(${accentRgb},0.1)` }]}
                  onPress={handleCreateInvite} disabled={creating}>
                  <Text style={[styles.primaryBtnText, { color: `rgba(${accentRgb},0.9)` }]}>
                    {creating ? 'generating…' : 'generate code'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.bigCodeWrap, { borderColor: `rgba(${accentRgb},0.3)`, backgroundColor: `rgba(${accentRgb},0.06)` }]}>
                  <Text style={[styles.bigCode, { color: `rgba(${accentRgb},0.95)` }]}>{inviteCode}</Text>
                  <Text style={[styles.bigCodeHint, { color: `${theme.textMuted}70` }]}>sponsor tab → i am the sponsor → enter this</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => setProximity(null)}>
                <Text style={[styles.backLink, { color: `rgba(${accentRgb},0.35)` }]}>← back</Text>
              </TouchableOpacity>
            </View>
          </NeonCard>
        )}

        {/* ── REMOTE — generate + share via Signal/iMessage ── */}
        {!isConnected && effectiveRole === 'user' && connState !== 'inviting' && proximity === 'remote' && (
          <NeonCard theme={theme} accentRgb={accentRgb}>
            <View style={styles.cardInner}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>send your sponsor a code</Text>
              <Text style={[styles.cardBody, { color: `${theme.textMuted}cc` }]}>
                a 6-character code. share it over Signal, iMessage, or a phone call.{'\n'}expires in 48 hours.
              </Text>
              {error && <Text style={[styles.errorText, { color: `rgba(${DANGER_RGB},0.9)` }]}>{error}</Text>}
              {!inviteCode ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, { borderColor: `rgba(${accentRgb},0.45)`, backgroundColor: `rgba(${accentRgb},0.1)` }]}
                  onPress={handleCreateInvite} disabled={creating}>
                  <Text style={[styles.primaryBtnText, { color: `rgba(${accentRgb},0.9)` }]}>
                    {creating ? 'generating…' : 'generate code'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <>
                  <View style={[styles.bigCodeWrap, { borderColor: `rgba(${accentRgb},0.3)`, backgroundColor: `rgba(${accentRgb},0.06)` }]}>
                    <Text style={[styles.bigCode, { color: `rgba(${accentRgb},0.95)` }]}>{inviteCode}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { borderColor: `rgba(${accentRgb},0.55)`, backgroundColor: `rgba(${accentRgb},0.12)` }]}
                    onPress={() => handleShareCode(inviteCode)}>
                    <Text style={[styles.primaryBtnText, { color: `rgba(${accentRgb},0.95)` }]}>
                      share via signal / imessage →
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity onPress={() => setProximity(null)}>
                <Text style={[styles.backLink, { color: `rgba(${accentRgb},0.35)` }]}>← back</Text>
              </TouchableOpacity>
            </View>
          </NeonCard>
        )}

        {/* ── USER: AWAITING SPONSOR ── */}
        {!isConnected && connState === 'inviting' && inviteCode && (
          <NeonCard theme={theme} accentRgb={accentRgb} borderIntensity={0.35} fillIntensity={0.06}>
            <View style={styles.cardInner}>
              <Text style={[styles.codeLabel, { color: `rgba(${accentRgb},0.5)` }]}>your invite code</Text>
              <Text style={[styles.codeDisplay, { color: `rgba(${accentRgb},0.95)` }]}>{inviteCode}</Text>
              <Text style={[styles.cardBody, { color: `${theme.textMuted}cc` }]}>
                share this with your sponsor.{'\n'}it expires in 48 hours.{'\n'}waiting for them to accept…
              </Text>
              <View style={[styles.waitingPill, { backgroundColor: `rgba(${accentRgb},0.08)`, borderColor: `rgba(${accentRgb},0.2)` }]}>
                <Text style={[styles.waitingText, { color: `rgba(${accentRgb},0.55)` }]}>· waiting ·</Text>
              </View>
            </View>
          </NeonCard>
        )}

        {/* ── SPONSOR: ENTER CODE ── */}
        {!isConnected && effectiveRole === 'sponsor' && (
          <NeonCard theme={theme} accentRgb={accentRgb}>
            <View style={styles.cardInner}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>enter invite code</Text>
              <Text style={[styles.cardBody, { color: `${theme.textMuted}cc` }]}>
                the person in recovery will share a 6-character code with you.
              </Text>
              <CodeInput value={codeInput} onChange={setCodeInput} theme={theme} accentRgb={accentRgb} />
              {error && <Text style={[styles.errorText, { color: `rgba(${DANGER_RGB},0.9)` }]}>{error}</Text>}
              <TouchableOpacity
                style={[styles.primaryBtn, {
                  borderColor: `rgba(${accentRgb},${codeInput.length === 6 ? 0.45 : 0.15})`,
                  backgroundColor: `rgba(${accentRgb},${codeInput.length === 6 ? 0.1 : 0.04})`,
                  opacity: codeInput.length === 6 ? 1 : 0.5,
                }]}
                onPress={handleAccept} disabled={codeInput.length < 6 || accepting}>
                <Text style={[styles.primaryBtnText, { color: `rgba(${accentRgb},0.9)` }]}>
                  {accepting ? 'connecting…' : 'connect as sponsor'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setRoleChoice(null)}>
                <Text style={[styles.backLink, { color: `rgba(${accentRgb},0.4)` }]}>← back</Text>
              </TouchableOpacity>
            </View>
          </NeonCard>
        )}

        {/* ── CONNECTED: USER VIEW ── */}
        {isConnected && role === 'user' && (
          <>
            {/* Status card */}
            <NeonCard theme={theme} accentRgb={NEON_RGB.cyan} fillIntensity={0.04} borderIntensity={0.18}>
              <View style={styles.cardInner}>
                <View style={styles.connectedHeader}>
                  <View style={[styles.connDot, { backgroundColor: `rgba(${NEON_RGB.cyan},0.9)` }]} />
                  <Text style={[styles.connectedTitle, { color: `rgba(${NEON_RGB.cyan},0.9)` }]}>sponsor connected</Text>
                </View>
                <Text style={[styles.codeLabel, { color: `rgba(${NEON_RGB.cyan},0.4)` }]}>channel code</Text>
                <Text style={[styles.codeSmall, { color: `rgba(${NEON_RGB.cyan},0.7)` }]}>{inviteCode}</Text>
                {status && (
                  <Text style={[styles.cardBody, { color: `${theme.textMuted}99` }]}>
                    stage: {status.orchidStage} · sponsor present: {status.sponsorPresent ? 'yes' : 'no'}
                  </Text>
                )}
              </View>
            </NeonCard>


            {/* ── RELAY TRANSPARENCY ── */}
            <TouchableOpacity onPress={() => setRelayOpen(o => !o)} style={styles.relayToggle} hitSlop={8} activeOpacity={0.7}>
              <Text style={[styles.relayToggleText, { color: `${theme.textMuted}50` }]}>
                {relayOpen ? '▲ ' : '▼ '}what the relay server sees right now
              </Text>
            </TouchableOpacity>
            {relayOpen && (
              <NeonCard theme={theme} accentRgb={accentRgb} fillIntensity={0.03} borderIntensity={0.1}>
                <View style={styles.relayCard}>
                  <Text style={[styles.relayTitle, { color: `rgba(${accentRgb},0.45)` }]}>relay server · live</Text>
                  {[
                    ['channel code',    inviteCode || '—'],
                    ['checked in today', status?.checkedIn ? 'yes' : 'no'],
                    ['recovery stage',  status?.orchidStage || '—'],
                    ['milestone count', String(status?.milestones ?? '—')],
                    ['messages',        'encrypted blobs — server cannot read'],
                    ['mood logs',       'not transmitted — stays on device'],
                    ['journal entries', 'not transmitted — stays on device'],
                    ['your name',       'not transmitted — stays on device'],
                    ['sobriety date',   'not transmitted — stays on device'],
                    ['private keys',    'never leave this phone'],
                  ].map(([field, value], i) => (
                    <View key={i} style={[styles.relayRow, i > 0 && { borderTopWidth: 1, borderTopColor: `rgba(${accentRgb},0.07)` }]}>
                      <Text style={[styles.relayField, { color: `${theme.textMuted}65` }]}>{field}</Text>
                      <Text style={[styles.relayValue, { color: `rgba(${accentRgb},0.75)` }]}>{value}</Text>
                    </View>
                  ))}
                </View>
              </NeonCard>
            )}

            {/* Daily check-in */}
            <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)`, marginTop: 20 }]}>daily check-in</Text>
            <NeonCard theme={theme} accentRgb={checkedInToday ? NEON_RGB.cyan : accentRgb}>
              <View style={styles.cardInner}>
                <View style={styles.checkRow}>
                  <View style={[styles.checkDot, { backgroundColor: checkedInToday ? `rgba(${NEON_RGB.cyan},0.9)` : `rgba(${accentRgb},0.25)` }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.checkTitle, { color: checkedInToday ? `rgba(${NEON_RGB.cyan},0.9)` : theme.text }]}>
                      {checkedInToday ? 'checked in today' : 'not checked in'}
                    </Text>
                    <Text style={[styles.checkSub, { color: `${theme.textMuted}80` }]}>
                      sponsor sees: yes/no only. nothing else.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.checkBtn, {
                      borderColor: checkedInToday ? `rgba(${NEON_RGB.cyan},0.45)` : `rgba(${accentRgb},0.35)`,
                      backgroundColor: checkedInToday ? `rgba(${NEON_RGB.cyan},0.1)` : `rgba(${accentRgb},0.08)`,
                    }]}
                    onPress={handleCheckIn}>
                    <Text style={[styles.checkBtnText, { color: checkedInToday ? `rgba(${NEON_RGB.cyan},0.9)` : `rgba(${accentRgb},0.9)` }]}>
                      {checkedInToday ? '✓ done' : 'check in'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </NeonCard>

            {/* Send presence */}
            <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)`, marginTop: 20 }]}>send presence</Text>
            <NeonCard theme={theme} accentRgb={accentRgb} fillIntensity={0.03} borderIntensity={0.12}>
              <View style={styles.cardInner}>
                <Text style={[styles.holdHint, { color: `${theme.textMuted}80` }]}>
                  water: hold 2 seconds — the longer you hold, the longer they feel it.{'\n'}
                  light: quick press — contact, then 8 seconds of resonance.
                </Text>
                <HoldButton label="water" sublabel="cool · present · hold to pour" colorRgb={WATER_RGB}
                  onFire={() => handleSendPresence('water')} theme={theme}
                  visual={<WaterVisual color={`rgba(${WATER_RGB},0.7)`} />} holdDuration={2000}
                  bgOverlay={<WaterFlood />} />
                <HoldButton label="light" sublabel="warm · witnessed · press to strike" colorRgb={LIGHT_RGB}
                  onFire={() => handleSendPresence('light')} theme={theme}
                  visual={<LightVisual color={`rgba(${LIGHT_RGB},0.7)`} />} holdDuration={700}
                  bgOverlay={<LightBloom />} />
              </View>
            </NeonCard>

            {/* Garden path */}
            {presenceLog.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)`, marginTop: 20 }]}>the garden path</Text>
                <GardenPath log={presenceLog} theme={theme} accentRgb={accentRgb} onClear={clearPresenceLog} />
              </>
            )}
          </>
        )}

        {/* ── CONNECTED: SPONSOR VIEW ── */}
        {isConnected && role === 'sponsor' && (
          <>
            <NeonCard theme={theme} accentRgb={NEON_RGB.violet} fillIntensity={0.04} borderIntensity={0.18}>
              <View style={styles.cardInner}>
                <View style={styles.connectedHeader}>
                  <View style={[styles.connDot, { backgroundColor: `rgba(${NEON_RGB.violet},0.9)` }]} />
                  <Text style={[styles.connectedTitle, { color: `rgba(${NEON_RGB.violet},0.9)` }]}>you are witnessing</Text>
                </View>
                {status ? (
                  <>
                    <View style={styles.statusGrid}>
                      <View style={styles.statusItem}>
                        <Text style={[styles.statusValue, { color: status.checkedIn ? `rgba(${NEON_RGB.cyan},0.9)` : `${theme.textMuted}80` }]}>
                          {status.checkedIn ? 'yes' : 'no'}
                        </Text>
                        <Text style={[styles.statusKey, { color: `${theme.textMuted}70` }]}>checked in today</Text>
                      </View>
                      <View style={styles.statusItem}>
                        <Text style={[styles.statusValue, { color: `rgba(${NEON_RGB.violet},0.85)` }]}>{status.orchidStage}</Text>
                        <Text style={[styles.statusKey, { color: `${theme.textMuted}70` }]}>stage</Text>
                      </View>
                      <View style={styles.statusItem}>
                        <Text style={[styles.statusValue, { color: `${theme.text}cc` }]}>{status.milestones}</Text>
                        <Text style={[styles.statusKey, { color: `${theme.textMuted}70` }]}>milestones</Text>
                      </View>
                    </View>
                    <Text style={[styles.cardBody, { color: `${theme.textMuted}80` }]}>
                      you cannot see mood logs, journal entries, sobriety date, or substance type.{'\n'}you are a witness — not a watcher.
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.cardBody, { color: `${theme.textMuted}99` }]}>waiting for their data…</Text>
                )}
              </View>
            </NeonCard>

            <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)`, marginTop: 20 }]}>send presence</Text>
            <NeonCard theme={theme} accentRgb={accentRgb} fillIntensity={0.03} borderIntensity={0.12}>
              <View style={styles.cardInner}>
                <Text style={[styles.holdHint, { color: `${theme.textMuted}80` }]}>
                  water: hold 2 seconds — the longer you hold, the longer they feel it.{'\n'}
                  light: quick press — contact, then 8 seconds of resonance.
                </Text>
                <HoldButton label="water" sublabel="cool · present · hold to pour" colorRgb={WATER_RGB}
                  onFire={() => handleSendPresence('water')} theme={theme}
                  visual={<WaterVisual color={`rgba(${WATER_RGB},0.7)`} />} holdDuration={2000}
                  bgOverlay={<WaterFlood />} />
                <HoldButton label="light" sublabel="warm · witnessed · press to strike" colorRgb={LIGHT_RGB}
                  onFire={() => handleSendPresence('light')} theme={theme}
                  visual={<LightVisual color={`rgba(${LIGHT_RGB},0.7)`} />} holdDuration={700}
                  bgOverlay={<LightBloom />} />
              </View>
            </NeonCard>
          </>
        )}

        {/* ── E2E MESSAGES ── */}
        {isConnected && (
          <>
            <TouchableOpacity onPress={() => setChatOpen(o => !o)} style={styles.msgSectionHeader} activeOpacity={0.6}>
              <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)`, marginTop: 16 }]}>
                messages · end-to-end encrypted{messages.length > 0 ? ` (${messages.length})` : ''}
              </Text>
              <Text style={[styles.msgChevron, { color: `rgba(${accentRgb},0.4)` }]}>{chatOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {chatOpen && (
              <NeonCard theme={theme} accentRgb={accentRgb} fillIntensity={0.03} borderIntensity={0.14}>
                {messages.length > 0 && (
                  <View style={styles.msgThreadHeader}>
                    <Text style={[styles.msgThreadCount, { color: `rgba(${accentRgb},0.4)` }]}>
                      {messages.length} message{messages.length !== 1 ? 's' : ''} · hold to delete
                    </Text>
                    <TouchableOpacity onPress={clearMessages}>
                      <Text style={[styles.clearText, { color: `rgba(${accentRgb},0.35)` }]}>clear all</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <ScrollView
                  ref={threadScrollRef}
                  style={styles.msgThread}
                  contentContainerStyle={styles.msgThreadContent}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  onContentSizeChange={() => {
                    if (messages.length > 0) threadScrollRef.current?.scrollToEnd({ animated: false });
                  }}
                >
                  {messages.length === 0 ? (
                    <Text style={[styles.msgEmpty, { color: `rgba(${accentRgb},0.35)` }]}>
                      {hasPeerKey ? 'no messages yet. say something.' : 'waiting for key exchange…'}
                    </Text>
                  ) : (
                    messages.slice(-40).map(msg => (
                      <TouchableOpacity
                        key={msg.id}
                        onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); deleteMessage(msg.id); }}
                        delayLongPress={500}
                        activeOpacity={0.75}
                        style={[
                          styles.msgBubble,
                          msg.from === 'me'
                            ? { alignSelf: 'flex-end', backgroundColor: `rgba(${accentRgb},0.12)`, borderColor: `rgba(${accentRgb},0.3)` }
                            : { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)' },
                        ]}
                      >
                        <Text style={[styles.msgText, { color: `${theme.text}ee` }]}>{msg.text}</Text>
                        <Text style={[styles.msgTime, { color: `rgba(${accentRgb},0.35)` }]}>{formatSignalTime(msg.timestamp)}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
                <View style={[styles.msgInputRow, { borderTopColor: `rgba(${accentRgb},0.1)` }]}>
                  <TextInput
                    value={messageInput}
                    onChangeText={setMessageInput}
                    placeholder={hasPeerKey ? 'message...' : 'waiting for key exchange…'}
                    placeholderTextColor={`rgba(${accentRgb},0.25)`}
                    style={[styles.msgInput, { color: theme.text, backgroundColor: `rgba(${accentRgb},0.05)` }]}
                    multiline maxLength={500} editable={hasPeerKey}
                    returnKeyType="send" onSubmitEditing={handleSendMessage} blurOnSubmit
                  />
                  <TouchableOpacity
                    onPress={handleSendMessage}
                    disabled={!messageInput.trim() || !hasPeerKey || sendingMsg}
                    style={[styles.msgSendBtn, {
                      backgroundColor: messageInput.trim() && hasPeerKey ? `rgba(${accentRgb},0.15)` : `rgba(${accentRgb},0.05)`,
                      borderColor: messageInput.trim() && hasPeerKey ? `rgba(${accentRgb},0.45)` : `rgba(${accentRgb},0.12)`,
                    }]}
                  >
                    <Text style={[styles.msgSendText, { color: `rgba(${accentRgb},${messageInput.trim() && hasPeerKey ? 0.9 : 0.3})` }]}>
                      {sendingMsg ? '…' : '→'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </NeonCard>
            )}
          </>
        )}

        {/* ── DISCONNECT ── */}
        {isConnected && (
          <>
            <Text style={[styles.sectionLabel, { color: `rgba(${DANGER_RGB},0.5)`, marginTop: 24 }]}>connection</Text>
            <NeonCard theme={theme} accentRgb={DANGER_RGB} fillIntensity={0.03} borderIntensity={0.18}>
              <View style={styles.cardInner}>
                <Text style={[styles.cardBody, { color: `${theme.textMuted}99` }]}>
                  closing this connection removes the channel from the relay server immediately.
                  {role === 'user' ? ' your sponsor loses visibility.' : ' you lose access to their check-in.'}
                </Text>
                <TouchableOpacity
                  style={[styles.dangerBtn, { borderColor: `rgba(${DANGER_RGB},0.4)`, backgroundColor: `rgba(${DANGER_RGB},0.06)` }]}
                  onPress={handleDisconnect}>
                  <Text style={[styles.dangerBtnText, { color: `rgba(${DANGER_RGB},0.8)` }]}>
                    {role === 'user' ? 'remove sponsor' : 'close connection'}
                  </Text>
                </TouchableOpacity>
              </View>
            </NeonCard>
          </>
        )}

        {/* ── SPONSOR PRIVACY ── */}
        {(() => {
          const [openFaq, setOpenFaq] = React.useState<number | null>(null);
          const SPONSOR_FAQ = [
            {
              q: 'What does my sponsor actually see?',
              a: 'Only what you choose to send: your daily check-in (yes or no), your recovery stage (a single word), number of milestones reached, and presence signals you explicitly trigger — water and light. They cannot see mood logs, journal entries, sobriety date, or any health data.',
            },
            {
              q: 'Can messages be intercepted?',
              a: 'No. Every message is encrypted on your device before it leaves. The relay server passes only ciphertext and immediately discards it. Keys are generated on your device and never transmitted — the server is structurally incapable of reading what it carries.',
            },
            {
              q: 'Can push notifications be intercepted?',
              a: 'No. Notifications are scheduled entirely on-device using local OS notifications. No notification content is sent to or stored by Kataleya.',
            },
          ];
          return (
            <>
              <Text style={[styles.sectionLabel, { color: `rgba(${accentRgb},0.5)`, marginTop: 24 }]}>
                privacy in this connection
              </Text>
              <NeonCard theme={theme} accentRgb={accentRgb} fillIntensity={0.02} borderIntensity={0.1}>
                <View style={[styles.cardInner, { gap: 8 }]}>
                  {[
                    'Daily check-in — yes or no, nothing else',
                    'Recovery stage — a single word',
                    'Milestones reached — a number',
                    'Presence signals you choose to send',
                  ].map((item, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: `rgba(${accentRgb},0.5)` }} />
                      <Text style={[styles.cardBody, { color: `${theme.textMuted}cc`, flex: 1 }]}>{item}</Text>
                    </View>
                  ))}
                  <Text style={[styles.hint, { color: `${theme.textMuted}55`, marginTop: 4 }]}>
                    mood logs, journal entries, and health data are never shared.
                  </Text>
                </View>
              </NeonCard>

              <NeonCard theme={theme} accentRgb={accentRgb} fillIntensity={0.02} borderIntensity={0.08} style={{ marginTop: 4 }}>
                {SPONSOR_FAQ.map((item, i) => {
                  const open = openFaq === i;
                  return (
                    <View
                      key={i}
                      style={[
                        { },
                        i < SPONSOR_FAQ.length - 1 && { borderBottomWidth: 1, borderBottomColor: `rgba(${accentRgb},0.08)` },
                      ]}
                    >
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}
                        onPress={() => { setOpenFaq(open ? null : i); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.cardBody, { color: theme.text, flex: 1 }]}>{item.q}</Text>
                        <Text style={[styles.hint, { color: `rgba(${accentRgb},0.5)` }]}>{open ? '∧' : '∨'}</Text>
                      </TouchableOpacity>
                      {open && (
                        <Text style={[styles.cardBody, { color: `${theme.textMuted}cc`, paddingHorizontal: 16, paddingBottom: 14, lineHeight: 19 }]}>
                          {item.a}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </NeonCard>
            </>
          );
        })()}

        <View style={[styles.footerNote, { borderColor: `rgba(${accentRgb},0.1)` }]}>
          <Text style={[styles.footerText, { color: `${theme.textMuted}55` }]}>
            signals are relayed and discarded — not stored permanently.{'\n'}
            messages are end-to-end encrypted. the server sees only ciphertext.{'\n'}
            no accounts. no logs.
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
  cardInner: { padding: 18, gap: 12 },
  cardTitle: { fontFamily: 'CourierPrime', fontSize: 15, fontWeight: '700', textTransform: 'lowercase' },
  cardBody: { fontFamily: 'CourierPrime', fontSize: 12, lineHeight: 19 },
  hint: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 0.5, lineHeight: 15 },
  errorText: { fontFamily: 'CourierPrime', fontSize: 12 },
  primaryBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 13, paddingHorizontal: 20, alignItems: 'center' },
  primaryBtnText: { fontFamily: 'CourierPrime', fontSize: 12, letterSpacing: 2, textTransform: 'lowercase' },
  backLink: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 1, textAlign: 'center' },
  roleRow: { flexDirection: 'row', gap: 10 },
  roleBtn: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 14, gap: 4, alignItems: 'center' },
  roleBtnTitle: { fontFamily: 'CourierPrime', fontSize: 13, fontWeight: '700', textAlign: 'center', textTransform: 'lowercase' },
  roleBtnSub: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1, textAlign: 'center' },
  codeLabel: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' },
  codeDisplay: { fontFamily: 'CourierPrime', fontSize: 32, fontWeight: '700', letterSpacing: 8, textAlign: 'center' },
  codeSmall: { fontFamily: 'CourierPrime', fontSize: 20, fontWeight: '700', letterSpacing: 5, textAlign: 'center' },
  codeInput: { borderWidth: 1, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 18, fontFamily: 'CourierPrime', fontSize: 22, letterSpacing: 8, textAlign: 'center' },
  waitingPill: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  waitingText: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 3 },
  connectedHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  connDot: { width: 8, height: 8, borderRadius: 4 },
  connectedTitle: { fontFamily: 'CourierPrime', fontSize: 14, fontWeight: '700', textTransform: 'lowercase' },
  statusGrid: { flexDirection: 'row', gap: 8 },
  statusItem: { flex: 1, alignItems: 'center', gap: 4, padding: 10 },
  statusValue: { fontFamily: 'CourierPrime', fontSize: 15, fontWeight: '700' },
  statusKey: { fontFamily: 'CourierPrime', fontSize: 9, letterSpacing: 1.5, textAlign: 'center', textTransform: 'uppercase' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  checkTitle: { fontFamily: 'CourierPrime', fontSize: 13, fontWeight: '700', textTransform: 'lowercase' },
  checkSub: { fontFamily: 'CourierPrime', fontSize: 10, lineHeight: 14, marginTop: 2 },
  checkBtn: { borderWidth: 1, borderRadius: 7, paddingVertical: 8, paddingHorizontal: 12 },
  checkBtnText: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 1.5, textTransform: 'lowercase' },
  holdHint: { fontFamily: 'CourierPrime', fontSize: 11, lineHeight: 17, textAlign: 'center' },
  holdBtn: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  holdBgImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  holdBtnInner: { flex: 1, flexDirection: 'row', position: 'relative' },
  holdFill: { position: 'absolute', top: 0, left: 0, bottom: 0 },
  holdBtnContent: { flex: 1, paddingVertical: 16, paddingHorizontal: 18, justifyContent: 'center', gap: 6, zIndex: 1 },
  holdBtnVisual: { alignItems: 'center', overflow: 'hidden' },
  holdBtnLabel: { fontFamily: 'CourierPrime', fontSize: 14, fontWeight: '700', letterSpacing: 2, textTransform: 'lowercase' },
  holdBtnSub: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 0.5 },
  signalBanner: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  signalIconWrap: { flexShrink: 0 },
  signalText: { flex: 1, gap: 3 },
  signalLabel: { fontFamily: 'CourierPrime', fontSize: 13, fontWeight: '700', letterSpacing: 2, textTransform: 'lowercase' },
  signalFrom: { fontFamily: 'CourierPrime', fontSize: 10 },
  gardenPath: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, minHeight: 28, alignItems: 'center', paddingVertical: 6 },
  gardenDot: { flexShrink: 0 },
  gardenCounts: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 10 },
  gardenCountItem: { alignItems: 'center', gap: 2 },
  gardenCountNum: { fontFamily: 'CourierPrime', fontSize: 16, fontWeight: '700' },
  gardenCountLabel: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1 },
  clearText: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 1 },
  rainbowDots: { flexDirection: 'column', alignItems: 'center', gap: 4, paddingVertical: 4, width: 12, flexShrink: 0 },
  rainbowDot: { width: 8, height: 8, borderRadius: 4 },
  dangerBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  dangerBtnText: { fontFamily: 'CourierPrime', fontSize: 12, letterSpacing: 2, textTransform: 'lowercase' },
  footerNote: { borderTopWidth: 1, paddingTop: 16, marginTop: 8, alignItems: 'center' },
  footerText: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1, textAlign: 'center', lineHeight: 16 },
  msgSectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  msgChevron: { fontFamily: 'CourierPrime', fontSize: 10, marginBottom: 3, paddingLeft: 8 },
  msgThreadHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 2 },
  msgThreadCount: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 0.5 },
  msgThread: { maxHeight: 300, minHeight: 60 },
  msgThreadContent: { padding: 14, gap: 8 },
  msgEmpty: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 1, textAlign: 'center', paddingVertical: 8 },
  msgBubble: { borderWidth: 1, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 13, maxWidth: '82%', gap: 4 },
  msgText: { fontFamily: 'CourierPrime', fontSize: 13, lineHeight: 19 },
  msgTime: { fontFamily: 'CourierPrime', fontSize: 9, letterSpacing: 0.5 },
  msgInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, borderTopWidth: 1, padding: 12 },
  msgInput: { flex: 1, fontFamily: 'CourierPrime', fontSize: 13, lineHeight: 19, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12, maxHeight: 100 },
  msgSendBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  msgSendText: { fontFamily: 'CourierPrime', fontSize: 16, fontWeight: '700' },

  bigCodeWrap: { borderWidth: 1, borderRadius: 12, paddingVertical: 22, paddingHorizontal: 20, alignItems: 'center', gap: 8 },
  bigCode: { fontFamily: 'CourierPrime', fontSize: 40, fontWeight: '700', letterSpacing: 10 },
  bigCodeHint: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1, textAlign: 'center' },
  relayToggle: { alignItems: 'center', paddingVertical: 8 },
  relayToggleText: { fontFamily: 'CourierPrime', fontSize: 9, letterSpacing: 2 },
  relayCard: { padding: 14 },
  relayTitle: { fontFamily: 'CourierPrime', fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 10 },
  relayRow: { flexDirection: 'row', paddingVertical: 8, gap: 8 },
  relayField: { fontFamily: 'CourierPrime', fontSize: 10, flex: 1 },
  relayValue: { fontFamily: 'CourierPrime', fontSize: 10, flex: 1.3, textAlign: 'right' },

  firstImpressionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingTop: 48,
    paddingBottom: 32,
    gap: 32,
  },
  firstImpressionQ: {
    fontFamily: 'CourierPrime',
    fontSize: 22,
    lineHeight: 34,
    textAlign: 'center',
    letterSpacing: 0.3,
    textTransform: 'lowercase',
  },
  firstImpressionInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontFamily: 'CourierPrime',
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'lowercase',
  },
  firstImpressionCta: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  firstImpressionCtaText: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'lowercase',
  },
});
