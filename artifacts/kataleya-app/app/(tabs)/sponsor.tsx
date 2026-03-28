import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Pressable,
  Animated,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useCircadian } from '@/hooks/useCircadian';
import { TAB_BAR_HEIGHT } from '@/constants/circadian';
import { useSponsorChannel } from '@/hooks/useSponsorChannel';
import { WaterVisual, LightVisual, WaterBanner, LightBanner } from '@/components/SignalIcons';
import { sponsorWater, sponsorLight } from '@/utils/hapticBloom';
import type { PresenceLogEntry } from '@/hooks/useSponsorChannel';

type RoleChoice = 'user' | 'sponsor' | null;

function CodeInput({ value, onChange, theme }: {
  value: string;
  onChange: (v: string) => void;
  theme: any;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={t => onChange(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
      placeholder="XXXXXX"
      placeholderTextColor={theme.textMuted}
      autoCapitalize="characters"
      autoCorrect={false}
      maxLength={6}
      returnKeyType="done"
      style={[styles.codeInput, {
        color: theme.accent,
        borderColor: value.length === 6 ? theme.accent : theme.border,
        backgroundColor: theme.surface,
      }]}
    />
  );
}

function HoldButton({
  label, sublabel, color, onFire, disabled, theme, visual, holdDuration = 2000,
}: {
  label: string;
  sublabel: string;
  color: string;
  onFire: () => void;
  disabled?: boolean;
  theme: any;
  visual?: React.ReactNode;
  holdDuration?: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const [holding, setHolding] = useState(false);
  const [fired, setFired] = useState(false);

  const begin = useCallback(() => {
    if (disabled || fired) return;
    setHolding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: holdDuration,
      useNativeDriver: false,
    });
    animRef.current.start(({ finished }) => {
      if (finished) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onFire();
        setFired(true);
        setHolding(false);
        setTimeout(() => {
          setFired(false);
          Animated.timing(progress, { toValue: 0, duration: 400, useNativeDriver: false }).start();
        }, 3000);
      }
    });
  }, [disabled, fired, onFire, progress]);

  const cancel = useCallback(() => {
    if (fired) return;
    setHolding(false);
    animRef.current?.stop();
    Animated.timing(progress, { toValue: 0, duration: 300, useNativeDriver: false }).start();
  }, [fired, progress]);

  const fill = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Pressable
      onPressIn={begin}
      onPressOut={cancel}
      style={[
        styles.holdBtn,
        {
          borderColor: fired ? color : holding ? color : theme.border,
          backgroundColor: fired ? `${color}25` : theme.surface,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <View style={styles.holdBtnInner}>
        <Animated.View
          style={[
            styles.holdFill,
            { width: fill, backgroundColor: `${color}30` },
          ]}
        />
        <View style={styles.holdBtnContent}>
          {visual && !fired && (
            <View style={styles.holdBtnVisual} pointerEvents="none">
              {visual}
            </View>
          )}
          <Text style={[styles.holdBtnLabel, { color: fired ? color : holding ? color : theme.text }]}>
            {fired ? `${label} sent` : label}
          </Text>
          <Text style={[styles.holdBtnSub, { color: theme.textMuted }]}>
            {fired ? 'received on their device' : holding ? 'keep holding…' : sublabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function IncomingSignalBanner({ type, count, latestTs, onDismiss, theme }: {
  type: 'water' | 'light';
  count: number;
  latestTs: number;
  onDismiss: (type: 'water' | 'light') => void;
  theme: any;
}) {
  const color = type === 'water' ? '#7fc9c9' : theme.gold ?? '#f0c060';
  const label = type === 'water' ? '〰 water' : '· light';

  let qualityLabel: string;
  if (type === 'water') {
    if (count >= 4)      qualityLabel = 'deep, sustained · waters in succession';
    else if (count >= 2) qualityLabel = 'deeper ripples · waters received';
    else                 qualityLabel = 'ripples from them';
  } else {
    if (count >= 4)      qualityLabel = 'held in warmth · lights in succession';
    else if (count >= 2) qualityLabel = 'warmth sustained · lights received';
    else                 qualityLabel = 'warm light from them';
  }

  return (
    <TouchableOpacity
      onPress={() => onDismiss(type)}
      style={[styles.signalBanner, { backgroundColor: `${color}15`, borderColor: `${color}40` }]}
    >
      <View style={styles.signalIconWrap}>
        {type === 'water' ? <WaterBanner color={color} /> : <LightBanner color={color} />}
      </View>
      <View style={styles.signalText}>
        <Text style={[styles.signalLabel, { color }]}>{label}{count > 1 ? ` ×${count}` : ''}</Text>
        <Text style={[styles.signalFrom, { color: theme.textMuted }]}>
          {qualityLabel}
        </Text>
        <Text style={[styles.signalFrom, { color: theme.textMuted, opacity: 0.5 }]}>
          {formatSignalTime(latestTs)} · tap to clear
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function RainbowBanner({ theme, onDismiss }: { theme: any; onDismiss: () => void }) {
  const colors = ['#7fc9c9', '#a0d090', '#e8c56a', '#f09060', '#c09080'];
  return (
    <TouchableOpacity
      onPress={onDismiss}
      style={[styles.signalBanner, { backgroundColor: '#ffffff10', borderColor: '#ffffff30' }]}
    >
      <View style={styles.rainbowDots}>
        {colors.map((c, i) => (
          <View key={i} style={[styles.rainbowDot, { backgroundColor: c }]} />
        ))}
      </View>
      <View style={styles.signalText}>
        <Text style={[styles.signalLabel, { color: '#e8c56a' }]}>the garden opens</Text>
        <Text style={[styles.signalFrom, { color: theme.textMuted }]}>
          water and light together · prism through the orchid
        </Text>
        <Text style={[styles.signalFrom, { color: theme.textMuted, opacity: 0.5 }]}>tap to clear</Text>
      </View>
    </TouchableOpacity>
  );
}

function formatSignalTime(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (isToday) return `today · ${time}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` · ${time}`;
}

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

function GardenPath({
  log, theme, onClear,
}: {
  log: PresenceLogEntry[];
  theme: any;
  onClear: (type?: 'water' | 'light') => void;
}) {
  const now = Date.now();
  const visible = log
    .filter(e => now - e.timestamp < TWENTY_FOUR_HOURS)
    .slice(-30)
    .sort((a, b) => a.timestamp - b.timestamp);

  const waterCount = visible.filter(e => e.type === 'water').length;
  const lightCount = visible.filter(e => e.type === 'light').length;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.cardInner}>
        <Text style={[styles.logHint, { color: theme.textMuted }]}>
          footprints in the garden · fades in 24 hours
        </Text>

        {/* The path */}
        <View style={styles.gardenPath}>
          {visible.map(entry => {
            const age = now - entry.timestamp;
            const opacity = Math.max(0.1, 1 - age / TWENTY_FOUR_HOURS);
            const size = entry.type === 'water' ? 10 : 8;
            const color = entry.type === 'water' ? '#7fc9c9' : (theme.gold ?? '#e8c56a');
            return (
              <View
                key={entry.id}
                style={[
                  styles.gardenDot,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: color,
                    opacity,
                  },
                ]}
              />
            );
          })}
          {visible.length === 0 && (
            <Text style={[styles.logHint, { color: theme.textMuted, opacity: 0.4 }]}>
              the path is empty
            </Text>
          )}
        </View>

        {/* Counts row */}
        <View style={styles.gardenCounts}>
          {waterCount > 0 && (
            <View style={styles.gardenCountItem}>
              <Text style={[styles.gardenCountNum, { color: '#7fc9c9' }]}>{waterCount}</Text>
              <Text style={[styles.gardenCountLabel, { color: theme.textMuted }]}>〰 water</Text>
            </View>
          )}
          {lightCount > 0 && (
            <View style={styles.gardenCountItem}>
              <Text style={[styles.gardenCountNum, { color: theme.gold ?? '#e8c56a' }]}>{lightCount}</Text>
              <Text style={[styles.gardenCountLabel, { color: theme.textMuted }]}>· light</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => onClear()} style={{ marginLeft: 'auto' as any }}>
            <Text style={[styles.logClearText, { color: theme.textMuted, opacity: 0.5 }]}>clear</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function SponsorScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useCircadian();
  const {
    role, connState, inviteCode, status, incomingSignals, presenceLog,
    messages, hasPeerKey,
    error, createInvite, acceptInvite, sendPresence, sendMessage, sendCheckIn,
    disconnect, dismissSignal, dismissSignalsByType, clearPresenceLog,
    deleteMessage, clearMessages, isConnected,
  } = useSponsorChannel();

  const [roleChoice, setRoleChoice] = useState<RoleChoice>(null);
  const [codeInput, setCodeInput] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [checkedInDate, setCheckedInDate] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Accumulation + rainbow ritual tracking
  const [sentSignalLog, setSentSignalLog] = useState<{ type: 'water' | 'light'; ts: number }[]>([]);
  const [rainbowActive, setRainbowActive] = useState(false);
  const rainbowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const threadScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (chatOpen && messages.length > 0) {
      setTimeout(() => threadScrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length, chatOpen]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 + TAB_BAR_HEIGHT : insets.bottom + TAB_BAR_HEIGHT;

  const today = new Date().toDateString();
  const checkedInToday = checkedIn && checkedInDate === today;

  useEffect(() => {
    if (status) {
      setCheckedIn(status.checkedIn);
      setCheckedInDate(status.checkedInDate);
    }
  }, [status]);

  useEffect(() => {
    if (isConnected && role) setRoleChoice(role);
  }, [isConnected, role]);

  // Fire sponsor presence haptics exactly once per unique incoming signal.
  // Tracked by signal ID so dismissal + re-render doesn't re-fire.
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

  const handleCreateInvite = async () => {
    setCreating(true);
    await createInvite();
    setCreating(false);
  };

  const handleAccept = async () => {
    if (codeInput.length < 6) return;
    Keyboard.dismiss();
    setAccepting(true);
    await acceptInvite(codeInput);
    setAccepting(false);
  };

  const handleCheckIn = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newState = !checkedInToday;
    setCheckedIn(newState);
    setCheckedInDate(newState ? today : null);
    if (newState) await sendCheckIn();
  };

  const handleDisconnect = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await disconnect();
    setRoleChoice(null);
    setCodeInput('');
    setCheckedIn(false);
    setCheckedInDate(null);
    setMessageInput('');
    setSentSignalLog([]);
    setRainbowActive(false);
    if (rainbowTimer.current) clearTimeout(rainbowTimer.current);
  };

  const handleSendPresence = (type: 'water' | 'light') => {
    sendPresence(type);
    const now = Date.now();
    setSentSignalLog(prev => {
      const next = [...prev.filter(s => now - s.ts < 90_000), { type, ts: now }];
      // Rainbow: opposite type was sent within 60 seconds
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
    Keyboard.dismiss();
    setSendingMsg(true);
    await sendMessage(messageInput);
    setMessageInput('');
    setSendingMsg(false);
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
          const latestTs = Math.max(...group.map(s => s.timestamp));
          return (
            <IncomingSignalBanner
              key={type}
              type={type}
              count={group.length}
              latestTs={latestTs}
              onDismiss={dismissSignalsByType}
              theme={theme}
            />
          );
        })}

        {/* Rainbow banner — water + light in sequence */}
        {rainbowActive && (
          <RainbowBanner theme={theme} onDismiss={() => setRainbowActive(false)} />
        )}

        <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>sponsor presence</Text>

        {/* ── ROLE PICKER (no connection yet) ───────────────────────────── */}
        {!isConnected && !roleChoice && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardInner}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Who are you in this session?</Text>
              <Text style={[styles.cardBody, { color: theme.textMuted }]}>
                One device is the person in recovery.{'\n'}The other is their sponsor.
              </Text>
              <View style={styles.roleRow}>
                <TouchableOpacity
                  style={[styles.roleBtn, { borderColor: theme.accent, backgroundColor: `${theme.accent}12` }]}
                  onPress={() => setRoleChoice('user')}
                >
                  <Text style={[styles.roleBtnTitle, { color: theme.accent }]}>I am in recovery</Text>
                  <Text style={[styles.roleBtnSub, { color: theme.textMuted }]}>generate invite code</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
                  onPress={() => setRoleChoice('sponsor')}
                >
                  <Text style={[styles.roleBtnTitle, { color: theme.text }]}>I am the sponsor</Text>
                  <Text style={[styles.roleBtnSub, { color: theme.textMuted }]}>enter invite code</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── USER: INVITE FLOW ──────────────────────────────────────────── */}
        {!isConnected && effectiveRole === 'user' && connState !== 'inviting' && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardInner}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Create an invite</Text>
              <Text style={[styles.cardBody, { color: theme.textMuted }]}>
                A 6-character code is generated on the server.{'\n'}Share it with your sponsor in person or via Signal.
              </Text>
              {error && <Text style={[styles.errorText, { color: '#ff6b6b' }]}>{error}</Text>}
              <TouchableOpacity
                style={[styles.primaryBtn, { borderColor: theme.accent, backgroundColor: `${theme.accent}15` }]}
                onPress={handleCreateInvite}
                disabled={creating}
              >
                <Text style={[styles.primaryBtnText, { color: theme.accent }]}>
                  {creating ? 'generating…' : 'Generate Invite Code'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setRoleChoice(null)}>
                <Text style={[styles.backLink, { color: theme.textMuted }]}>← back</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── USER: AWAITING SPONSOR ─────────────────────────────────────── */}
        {!isConnected && connState === 'inviting' && inviteCode && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardInner}>
              <Text style={[styles.codeLabel, { color: theme.textMuted }]}>your invite code</Text>
              <Text style={[styles.codeDisplay, { color: theme.accent }]}>{inviteCode}</Text>
              <Text style={[styles.cardBody, { color: theme.textMuted }]}>
                Share this with your sponsor.{'\n'}
                It expires in 48 hours.{'\n'}
                Waiting for them to accept…
              </Text>
              <View style={[styles.waitingDot, { backgroundColor: `${theme.accent}30`, borderColor: `${theme.accent}50` }]}>
                <Text style={[styles.waitingText, { color: theme.textMuted }]}>· waiting ·</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── SPONSOR: ENTER CODE ────────────────────────────────────────── */}
        {!isConnected && effectiveRole === 'sponsor' && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.cardInner}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Enter invite code</Text>
              <Text style={[styles.cardBody, { color: theme.textMuted }]}>
                The person in recovery will share a 6-character code with you.
              </Text>
              <CodeInput value={codeInput} onChange={setCodeInput} theme={theme} />
              {error && <Text style={[styles.errorText, { color: '#ff6b6b' }]}>{error}</Text>}
              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  {
                    borderColor: codeInput.length === 6 ? theme.accent : theme.border,
                    backgroundColor: codeInput.length === 6 ? `${theme.accent}15` : `${theme.border}10`,
                    opacity: codeInput.length === 6 ? 1 : 0.5,
                  },
                ]}
                onPress={handleAccept}
                disabled={codeInput.length < 6 || accepting}
              >
                <Text style={[styles.primaryBtnText, { color: theme.accent }]}>
                  {accepting ? 'connecting…' : 'Connect as Sponsor'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setRoleChoice(null)}>
                <Text style={[styles.backLink, { color: theme.textMuted }]}>← back</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── CONNECTED: USER VIEW ───────────────────────────────────────── */}
        {isConnected && role === 'user' && (
          <>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardInner}>
                <View style={styles.connectedHeader}>
                  <View style={[styles.connDot, { backgroundColor: theme.success ?? '#4ade80' }]} />
                  <Text style={[styles.connectedTitle, { color: theme.text }]}>Sponsor connected</Text>
                </View>
                <Text style={[styles.codeLabel, { color: theme.textMuted }]}>your channel code</Text>
                <Text style={[styles.codeSmall, { color: theme.accent }]}>{inviteCode}</Text>
                {status && (
                  <Text style={[styles.cardBody, { color: theme.textMuted }]}>
                    Orchid stage: {status.orchidStage}{'\n'}
                    Sponsor present: {status.sponsorPresent ? 'yes' : 'no'}
                  </Text>
                )}
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 20 }]}>daily check-in</Text>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardInner}>
                <View style={styles.checkRow}>
                  <View style={[styles.checkDot, { backgroundColor: checkedInToday ? (theme.success ?? '#4ade80') : theme.border }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.checkTitle, { color: theme.text }]}>
                      {checkedInToday ? 'checked in today' : 'not checked in'}
                    </Text>
                    <Text style={[styles.checkSub, { color: theme.textMuted }]}>
                      Sponsor sees: yes/no only. Nothing else.
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.checkBtn,
                      {
                        borderColor: checkedInToday ? (theme.success ?? '#4ade80') : theme.accent,
                        backgroundColor: checkedInToday ? `${theme.success ?? '#4ade80'}15` : `${theme.accent}10`,
                      },
                    ]}
                    onPress={handleCheckIn}
                  >
                    <Text style={[styles.checkBtnText, { color: checkedInToday ? (theme.success ?? '#4ade80') : theme.accent }]}>
                      {checkedInToday ? '✓ done' : 'check in'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 20 }]}>send presence</Text>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardInner}>
                <Text style={[styles.holdHint, { color: theme.textMuted }]}>
                  Water: hold 2 seconds — the longer you hold, the longer they feel it.{'\n'}
                  Light: quick press — contact, then 8 seconds of resonance.
                </Text>
                <HoldButton
                  label="water"
                  sublabel="cool · present · hold to pour"
                  color="#7fc9c9"
                  onFire={() => handleSendPresence('water')}
                  theme={theme}
                  visual={<WaterVisual color="#7fc9c9" />}
                  holdDuration={2000}
                />
                <HoldButton
                  label="light"
                  sublabel="warm · witnessed · press to strike"
                  color={theme.gold ?? '#e8c56a'}
                  onFire={() => handleSendPresence('light')}
                  theme={theme}
                  visual={<LightVisual color={theme.gold ?? '#e8c56a'} />}
                  holdDuration={700}
                />
              </View>
            </View>

            {/* ── GARDEN PATH ───────────────────────────────────────────── */}
            {presenceLog.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 20 }]}>the garden path</Text>
                <GardenPath
                  log={presenceLog}
                  theme={theme}
                  onClear={clearPresenceLog}
                />
              </>
            )}
          </>
        )}

        {/* ── CONNECTED: SPONSOR VIEW ────────────────────────────────────── */}
        {isConnected && role === 'sponsor' && (
          <>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardInner}>
                <View style={styles.connectedHeader}>
                  <View style={[styles.connDot, { backgroundColor: theme.success ?? '#4ade80' }]} />
                  <Text style={[styles.connectedTitle, { color: theme.text }]}>You are witnessing</Text>
                </View>
                {status ? (
                  <>
                    <View style={styles.statusGrid}>
                      <View style={styles.statusItem}>
                        <Text style={[styles.statusValue, {
                          color: status.checkedIn ? (theme.success ?? '#4ade80') : theme.textMuted
                        }]}>
                          {status.checkedIn ? 'yes' : 'no'}
                        </Text>
                        <Text style={[styles.statusKey, { color: theme.textMuted }]}>checked in today</Text>
                      </View>
                      <View style={styles.statusItem}>
                        <Text style={[styles.statusValue, { color: theme.accent }]}>{status.orchidStage}</Text>
                        <Text style={[styles.statusKey, { color: theme.textMuted }]}>orchid stage</Text>
                      </View>
                      <View style={styles.statusItem}>
                        <Text style={[styles.statusValue, { color: theme.text }]}>{status.milestones}</Text>
                        <Text style={[styles.statusKey, { color: theme.textMuted }]}>milestones</Text>
                      </View>
                    </View>
                    <Text style={[styles.cardBody, { color: theme.textMuted }]}>
                      You cannot see mood logs, journal entries, sobriety date, or substance type.{'\n'}
                      You are a witness — not a watcher.
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.cardBody, { color: theme.textMuted }]}>Waiting for their data…</Text>
                )}
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 20 }]}>send presence</Text>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardInner}>
                <Text style={[styles.holdHint, { color: theme.textMuted }]}>
                  Water: hold 2 seconds — the longer you hold, the longer they feel it.{'\n'}
                  Light: quick press — contact, then 8 seconds of resonance.
                </Text>
                <HoldButton
                  label="water"
                  sublabel="cool · present · hold to pour"
                  color="#7fc9c9"
                  onFire={() => handleSendPresence('water')}
                  theme={theme}
                  visual={<WaterVisual color="#7fc9c9" />}
                  holdDuration={2000}
                />
                <HoldButton
                  label="light"
                  sublabel="warm · witnessed · press to strike"
                  color={theme.gold ?? '#e8c56a'}
                  onFire={() => handleSendPresence('light')}
                  theme={theme}
                  visual={<LightVisual color={theme.gold ?? '#e8c56a'} />}
                  holdDuration={700}
                />
              </View>
            </View>
          </>
        )}

        {/* ── E2E ENCRYPTED MESSAGES ──────────────────────────────────────── */}
        {isConnected && (
          <>
            {/* Tappable header — collapses/expands thread */}
            <TouchableOpacity
              onPress={() => setChatOpen(o => !o)}
              style={styles.msgSectionHeader}
              activeOpacity={0.6}
            >
              <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 16 }]}>
                messages · end-to-end encrypted
                {messages.length > 0 ? ` (${messages.length})` : ''}
              </Text>
              <Text style={[styles.msgChevron, { color: theme.textMuted }]}>
                {chatOpen ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {chatOpen && (
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {/* Thread header with clear-all */}
                {messages.length > 0 && (
                  <View style={styles.msgThreadHeader}>
                    <Text style={[styles.msgThreadCount, { color: theme.textMuted }]}>
                      {messages.length} message{messages.length !== 1 ? 's' : ''} · hold to delete
                    </Text>
                    <TouchableOpacity onPress={clearMessages}>
                      <Text style={[styles.logClearText, { color: theme.textMuted }]}>clear all</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Message thread */}
                <ScrollView
                  ref={threadScrollRef}
                  style={styles.msgThread}
                  contentContainerStyle={styles.msgThreadContent}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  onContentSizeChange={() => {
                    if (messages.length > 0) {
                      threadScrollRef.current?.scrollToEnd({ animated: false });
                    }
                  }}
                >
                  {messages.length === 0 ? (
                    <Text style={[styles.msgEmpty, { color: theme.textMuted }]}>
                      {hasPeerKey
                        ? 'no messages yet. say something.'
                        : 'waiting for key exchange…'}
                    </Text>
                  ) : (
                    messages.slice(-40).map(msg => (
                      <TouchableOpacity
                        key={msg.id}
                        onLongPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                          deleteMessage(msg.id);
                        }}
                        delayLongPress={500}
                        activeOpacity={0.75}
                        style={[
                          styles.msgBubble,
                          msg.from === 'me'
                            ? [styles.msgBubbleMe, { backgroundColor: `${theme.accent}22`, borderColor: `${theme.accent}40` }]
                            : [styles.msgBubbleThem, { backgroundColor: `${theme.border}30`, borderColor: `${theme.border}60` }],
                        ]}
                      >
                        <Text style={[styles.msgText, { color: theme.text }]}>{msg.text}</Text>
                        <Text style={[styles.msgTime, { color: theme.textMuted }]}>
                          {formatSignalTime(msg.timestamp)}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>

                {/* Input row */}
                <View style={[styles.msgInputRow, { borderTopColor: `${theme.border}50` }]}>
                  <TextInput
                    value={messageInput}
                    onChangeText={setMessageInput}
                    placeholder={hasPeerKey ? 'type a message…' : 'waiting for key exchange…'}
                    placeholderTextColor={theme.textMuted}
                    style={[styles.msgInput, { color: theme.text, backgroundColor: `${theme.border}20` }]}
                    multiline
                    maxLength={500}
                    editable={hasPeerKey}
                    returnKeyType="send"
                    onSubmitEditing={handleSendMessage}
                    blurOnSubmit
                  />
                  <TouchableOpacity
                    onPress={handleSendMessage}
                    disabled={!messageInput.trim() || !hasPeerKey || sendingMsg}
                    style={[
                      styles.msgSendBtn,
                      {
                        backgroundColor: messageInput.trim() && hasPeerKey
                          ? `${theme.accent}30`
                          : `${theme.border}20`,
                        borderColor: messageInput.trim() && hasPeerKey
                          ? `${theme.accent}60`
                          : `${theme.border}40`,
                      },
                    ]}
                  >
                    <Text style={[styles.msgSendText, {
                      color: messageInput.trim() && hasPeerKey ? theme.accent : theme.textMuted,
                    }]}>
                      {sendingMsg ? '…' : '→'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        {/* ── DISCONNECT ──────────────────────────────────────────────────── */}
        {isConnected && (
          <>
            <Text style={[styles.sectionLabel, { color: '#ff6b6b80', marginTop: 24 }]}>connection</Text>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: '#ff404040' }]}>
              <View style={styles.cardInner}>
                <Text style={[styles.cardBody, { color: theme.textMuted }]}>
                  Closing this connection removes the channel from the relay server immediately.
                  {role === 'user' ? ' Your sponsor loses visibility.' : ' You lose access to their check-in.'}
                </Text>
                <TouchableOpacity
                  style={[styles.dangerBtn, { borderColor: '#ff404060' }]}
                  onPress={handleDisconnect}
                >
                  <Text style={[styles.dangerBtnText, { color: '#ff6b6b' }]}>
                    {role === 'user' ? 'Remove Sponsor' : 'Close Connection'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        <View style={[styles.footerNote, { borderColor: `${theme.border}50` }]}>
          <Text style={[styles.footerText, { color: theme.textMuted }]}>
            Signals are relayed and discarded — not stored permanently.{'\n'}
            Messages are end-to-end encrypted. The server sees only ciphertext.{'\n'}
            No accounts. No logs.
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
  cardInner: { padding: 18, gap: 12 },
  cardTitle: { fontFamily: 'CourierPrime', fontSize: 16, fontWeight: '700' },
  cardBody: { fontFamily: 'CourierPrime', fontSize: 12, lineHeight: 19, opacity: 0.85 },
  errorText: { fontFamily: 'CourierPrime', fontSize: 12 },
  primaryBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 13, paddingHorizontal: 20, alignItems: 'center' },
  primaryBtnText: { fontFamily: 'CourierPrime', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },
  backLink: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 1, textAlign: 'center' },

  roleRow: { flexDirection: 'row', gap: 10 },
  roleBtn: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 14, gap: 4, alignItems: 'center' },
  roleBtnTitle: { fontFamily: 'CourierPrime', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  roleBtnSub: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1, textAlign: 'center' },

  codeLabel: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' },
  codeDisplay: { fontFamily: 'CourierPrime', fontSize: 32, fontWeight: '700', letterSpacing: 8, textAlign: 'center' },
  codeSmall: { fontFamily: 'CourierPrime', fontSize: 20, fontWeight: '700', letterSpacing: 5, textAlign: 'center' },
  codeInput: {
    borderWidth: 1, borderRadius: 8,
    paddingVertical: 14, paddingHorizontal: 18,
    fontFamily: 'CourierPrime', fontSize: 22,
    letterSpacing: 8, textAlign: 'center',
  },

  waitingDot: { borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  waitingText: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 3 },

  connectedHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  connDot: { width: 8, height: 8, borderRadius: 4 },
  connectedTitle: { fontFamily: 'CourierPrime', fontSize: 15, fontWeight: '700' },

  statusGrid: { flexDirection: 'row', gap: 8 },
  statusItem: { flex: 1, alignItems: 'center', gap: 4, padding: 10 },
  statusValue: { fontFamily: 'CourierPrime', fontSize: 15, fontWeight: '700' },
  statusKey: { fontFamily: 'CourierPrime', fontSize: 9, letterSpacing: 1.5, textAlign: 'center', textTransform: 'uppercase' },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  checkTitle: { fontFamily: 'CourierPrime', fontSize: 13, fontWeight: '700' },
  checkSub: { fontFamily: 'CourierPrime', fontSize: 10, lineHeight: 14, marginTop: 2 },
  checkBtn: { borderWidth: 1, borderRadius: 7, paddingVertical: 8, paddingHorizontal: 12 },
  checkBtnText: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 1.5 },

  holdHint: { fontFamily: 'CourierPrime', fontSize: 11, lineHeight: 17, textAlign: 'center' },
  holdBtn: {
    borderWidth: 1, borderRadius: 10, overflow: 'hidden',
  },
  holdBtnInner: { flex: 1, flexDirection: 'row', position: 'relative' },
  holdFill: { position: 'absolute', top: 0, left: 0, bottom: 0 },
  holdBtnContent: { flex: 1, paddingVertical: 14, paddingHorizontal: 16, justifyContent: 'center', gap: 6, zIndex: 1 },
  holdBtnVisual: { alignItems: 'center', overflow: 'hidden' },
  holdBtnLabel: { fontFamily: 'CourierPrime', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  holdBtnSub: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 0.5 },

  signalBanner: {
    borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 8,
  },
  signalIconWrap: { flexShrink: 0 },
  signalText: { flex: 1, gap: 3 },
  signalLabel: { fontFamily: 'CourierPrime', fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  signalFrom: { fontFamily: 'CourierPrime', fontSize: 10 },

  dangerBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  dangerBtnText: { fontFamily: 'CourierPrime', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },

  footerNote: { borderTopWidth: 1, paddingTop: 16, marginTop: 8, alignItems: 'center' },
  footerText: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1, textAlign: 'center', lineHeight: 16 },

  logRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  logLeft: { flex: 1, gap: 3 },
  logType: { fontFamily: 'CourierPrime-Bold', fontSize: 13, letterSpacing: 2 },
  logCount: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 0.5 },
  logClear: { paddingLeft: 16, paddingVertical: 4 },
  logClearText: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 1, textDecorationLine: 'underline' },
  logDivider: { height: 1, marginVertical: 8 },
  logHint: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 0.5, opacity: 0.7 },

  gardenPath: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    minHeight: 28,
    alignItems: 'center',
    paddingVertical: 6,
  },
  gardenDot: { flexShrink: 0 },
  gardenCounts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 10,
  },
  gardenCountItem: { alignItems: 'center', gap: 2 },
  gardenCountNum: { fontFamily: 'CourierPrime-Bold', fontSize: 16 },
  gardenCountLabel: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 1 },

  rainbowDots: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    width: 12,
    flexShrink: 0,
  },
  rainbowDot: { width: 8, height: 8, borderRadius: 4 },

  msgSectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  msgChevron: { fontFamily: 'CourierPrime', fontSize: 10, marginBottom: 3, paddingLeft: 8 },
  msgThreadHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 2 },
  msgThreadCount: { fontFamily: 'CourierPrime', fontSize: 10, letterSpacing: 0.5 },
  msgThread: { maxHeight: 300, minHeight: 60 },
  msgThreadContent: { padding: 14, gap: 8 },
  msgEmpty: { fontFamily: 'CourierPrime', fontSize: 11, letterSpacing: 1, textAlign: 'center', opacity: 0.6, paddingVertical: 8 },
  msgBubble: { borderWidth: 1, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 13, maxWidth: '82%', gap: 4 },
  msgBubbleMe: { alignSelf: 'flex-end' },
  msgBubbleThem: { alignSelf: 'flex-start' },
  msgText: { fontFamily: 'CourierPrime', fontSize: 13, lineHeight: 19 },
  msgTime: { fontFamily: 'CourierPrime', fontSize: 9, letterSpacing: 0.5, opacity: 0.6 },
  msgInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, borderTopWidth: 1, padding: 12 },
  msgInput: {
    flex: 1, fontFamily: 'CourierPrime', fontSize: 13, lineHeight: 19,
    borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12, maxHeight: 100,
  },
  msgSendBtn: {
    borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  msgSendText: { fontFamily: 'CourierPrime', fontSize: 16, fontWeight: '700' },
});
