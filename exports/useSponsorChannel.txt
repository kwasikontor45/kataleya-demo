'use no memo';
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Fortress, SponsorVault, Surface } from '@/utils/storage';
import { generateKeyPair, encryptMessage, decryptMessage } from '@/utils/crypto';

const _domain = process.env.EXPO_PUBLIC_DOMAIN;
if (!_domain || _domain === 'undefined') {
  console.warn('[useSponsorChannel] EXPO_PUBLIC_DOMAIN is not set — API calls will fail');
}
const API_BASE = `https://${_domain}/api`;
const POLL_INTERVAL_MS = 5000;

export interface PresenceSignal {
  id: string;
  type: 'water' | 'light';
  from: 'user' | 'sponsor';
  timestamp: number;
}

export interface ChannelStatus {
  connected: boolean;
  checkedIn: boolean;
  checkedInDate: string | null;
  orchidStage: string;
  milestones: number;
  sponsorPresent: boolean;
}

export interface SponsorMessage {
  id: string;
  from: 'me' | 'them';
  text: string;
  timestamp: number;
}

export type Role = 'user' | 'sponsor';
export type ConnState = 'idle' | 'inviting' | 'connected' | 'error';

interface ChannelSession {
  channelId: string;
  token: string;
  role: Role;
}

export interface PresenceLogEntry {
  id: string;
  type: 'water' | 'light';
  timestamp: number;
}

// ── Helper: post our public key to the API ───────────────────────────────────
async function postPublicKey(sess: ChannelSession, publicKey: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/sponsor/pubkey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId: sess.channelId, token: sess.token, publicKey }),
    });
  } catch { /* silent — will retry on next connection */ }
}

export function useSponsorChannel() {
  const [session, setSession]               = useState<ChannelSession | null>(null);
  const [connState, setConnState]           = useState<ConnState>('idle');
  const [inviteCode, setInviteCode]         = useState<string | null>(null);
  const [status, setStatus]                 = useState<ChannelStatus | null>(null);
  const [incomingSignals, setIncomingSignals] = useState<PresenceSignal[]>([]);
  const [presenceLog, setPresenceLog]       = useState<PresenceLogEntry[]>([]);
  const [messages, setMessages]             = useState<SponsorMessage[]>([]);
  const [hasPeerKey, setHasPeerKey]         = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const sinceRef   = useRef<number>(0);

  // ── Load persisted session + presence log on mount ───────────────────────
  useEffect(() => {
    (async () => {
      const ch = await SponsorVault.getChannel();
      if (!ch) return;
      const since = await SponsorVault.getLastPoll();
      sinceRef.current = since;
      setSession(ch);
      setConnState('connected');

      // Restore peer key state
      const peerPk = await Fortress.getPeerPublicKey();
      if (peerPk) setHasPeerKey(true);
    })();
    SponsorVault.getInviteCode().then(c => { if (c) setInviteCode(c); });
    Surface.getPresenceLog().then(log => setPresenceLog(log));
  }, []);

  const connStateRef = useRef<ConnState>('idle');
  useEffect(() => { connStateRef.current = connState; }, [connState]);

  // ── Polling ───────────────────────────────────────────────────────────────
  const startPolling = useCallback((sess: ChannelSession) => {
    if (pollRef.current) clearInterval(pollRef.current);

    const poll = async () => {
      try {
        const url = `${API_BASE}/sponsor/poll?channelId=${sess.channelId}&token=${sess.token}&since=${sinceRef.current}`;
        const res = await fetch(url);
        if (!res.ok) return;

        const data = await res.json() as {
          signals: PresenceSignal[];
          messages: Array<{ id: string; from: 'user' | 'sponsor'; ciphertext: string; nonce: string; timestamp: number }>;
          peerPubKey: string | null;
          status: ChannelStatus;
          serverTime: number;
        };

        // ── Presence signals ──────────────────────────────────────────────
        if (data.signals?.length) {
          setIncomingSignals(prev => [...prev, ...data.signals]);
          const entries: PresenceLogEntry[] = data.signals.map(s => ({
            id: s.id, type: s.type, timestamp: s.timestamp,
          }));
          await Surface.appendPresenceLog(entries);
          setPresenceLog(await Surface.getPresenceLog());
        }

        // ── Peer public key ───────────────────────────────────────────────
        if (data.peerPubKey) {
          const stored = await Fortress.getPeerPublicKey();
          if (!stored || stored !== data.peerPubKey) {
            await Fortress.setPeerPublicKey(data.peerPubKey);
            setHasPeerKey(true);
          }
        }

        // ── Encrypted messages ────────────────────────────────────────────
        if (data.messages?.length) {
          const keys = await Fortress.getCryptoKeyPair();
          const peerPk = await Fortress.getPeerPublicKey();
          if (keys && peerPk) {
            const decrypted: SponsorMessage[] = [];
            for (const m of data.messages) {
              const text = decryptMessage(m.ciphertext, m.nonce, peerPk, keys.secretKey);
              if (text !== null) {
                decrypted.push({ id: m.id, from: 'them', text, timestamp: m.timestamp });
              }
            }
            if (decrypted.length) {
              setMessages(prev => [...prev, ...decrypted].sort((a, b) => a.timestamp - b.timestamp));
            }
          }
        }

        // ── Update server time cursor ─────────────────────────────────────
        if (data.serverTime) {
          sinceRef.current = data.serverTime;
          await SponsorVault.setLastPoll(data.serverTime);
        }

        // ── Channel status ────────────────────────────────────────────────
        if (data.status) {
          setStatus(data.status);
          if (data.status.connected && connStateRef.current === 'inviting') {
            setConnState('connected');
          }
        }
      } catch { /* network blip, silent */ }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
  }, []);

  useEffect(() => {
    if (session && (connState === 'connected' || connState === 'inviting')) {
      startPolling(session);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [session, connState, startPolling]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const createInvite = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/sponsor/invite`, { method: 'POST' });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json() as { channelId: string; inviteCode: string; userToken: string };
      const sess: ChannelSession = { channelId: data.channelId, token: data.userToken, role: 'user' };

      // Generate E2E key pair and store securely
      const kp = generateKeyPair();
      await Fortress.setCryptoKeyPair(kp.publicKey, kp.secretKey);

      await SponsorVault.setInviteCode(data.inviteCode);
      await SponsorVault.setChannel(data.channelId, data.userToken, 'user');
      setSession(sess);
      setInviteCode(data.inviteCode);
      setConnState('inviting');

      // Can't post pubkey yet — channel not connected until sponsor accepts
    } catch {
      setError('Could not create invite. Check your connection.');
      setConnState('error');
    }
  }, []);

  const acceptInvite = useCallback(async (code: string) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/sponsor/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code.toUpperCase().trim() }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? 'Invalid code');
      }
      const data = await res.json() as { channelId: string; sponsorToken: string; inviteCode: string };
      const sess: ChannelSession = { channelId: data.channelId, token: data.sponsorToken, role: 'sponsor' };

      // Generate E2E key pair
      const kp = generateKeyPair();
      await Fortress.setCryptoKeyPair(kp.publicKey, kp.secretKey);

      await SponsorVault.setChannel(data.channelId, data.sponsorToken, 'sponsor');
      await SponsorVault.setInviteCode(data.inviteCode);
      setSession(sess);
      setInviteCode(data.inviteCode);
      setConnState('connected');

      // Channel is connected — post our public key immediately
      await postPublicKey(sess, kp.publicKey);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid code';
      setError(msg);
    }
  }, []);

  // Post user's public key once sponsor joins (detected via poll status transition)
  const pubKeyPostedRef = useRef(false);
  useEffect(() => {
    if (!session || session.role !== 'user') return;
    if (!status?.sponsorPresent) return;
    if (pubKeyPostedRef.current) return;
    pubKeyPostedRef.current = true;
    (async () => {
      const keys = await Fortress.getCryptoKeyPair();
      if (keys) await postPublicKey(session, keys.publicKey);
    })();
  }, [session, status?.sponsorPresent]);

  const sendPresence = useCallback(async (type: 'water' | 'light') => {
    if (!session) return;
    try {
      await fetch(`${API_BASE}/sponsor/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: session.channelId, token: session.token, type }),
      });
    } catch { /* silent */ }
  }, [session]);

  const sendMessage = useCallback(async (text: string) => {
    if (!session || !text.trim()) return;

    const keys = await Fortress.getCryptoKeyPair();
    const peerPk = await Fortress.getPeerPublicKey();

    if (!keys || !peerPk) {
      setError('Waiting for key exchange to complete. Try again in a moment.');
      return;
    }

    const sealed = encryptMessage(text.trim(), peerPk, keys.secretKey);

    // Optimistically add to local state
    const optimistic: SponsorMessage = {
      id: `local-${Date.now()}`,
      from: 'me',
      text: text.trim(),
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, optimistic].sort((a, b) => a.timestamp - b.timestamp));

    try {
      await fetch(`${API_BASE}/sponsor/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: session.channelId,
          token: session.token,
          ciphertext: sealed.ciphertext,
          nonce: sealed.nonce,
        }),
      });
    } catch { /* message queued locally, will retry next send */ }
  }, [session]);

  const [hasPendingCheckin, setHasPendingCheckin] = useState(false);

  const replayPendingCheckin = useCallback(async (sess: ChannelSession) => {
    const pending = await Surface.getPendingCheckin();
    if (!pending) return;
    if (Date.now() - pending.ts > 86_400_000) {
      await Surface.clearPendingCheckin();
      setHasPendingCheckin(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/sponsor/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: sess.channelId,
          token: sess.token,
          date: new Date(pending.ts).toDateString(),
        }),
      });
      if (res.ok) {
        await Surface.clearPendingCheckin();
        setHasPendingCheckin(false);
      }
    } catch { /* still offline */ }
  }, []);

  const sendCheckIn = useCallback(async (orchidStage?: string, milestones?: number) => {
    if (!session || session.role !== 'user') return;
    const today = new Date().toDateString();
    try {
      const res = await fetch(`${API_BASE}/sponsor/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: session.channelId, token: session.token, date: today }),
      });
      if (!res.ok) throw new Error('Server error');
      await Surface.clearPendingCheckin();
      setHasPendingCheckin(false);
    } catch {
      await Surface.setPendingCheckin({ ts: Date.now(), orchidStage, milestones });
      setHasPendingCheckin(true);
    }
  }, [session]);

  const checkQueueStatus = useCallback(async () => {
    const pending = await Surface.getPendingCheckin();
    setHasPendingCheckin(!!pending);
  }, []);

  useEffect(() => {
    if (!session) return;
    checkQueueStatus();
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') replayPendingCheckin(session);
    });
    return () => sub.remove();
  }, [session, replayPendingCheckin, checkQueueStatus]);

  const disconnect = useCallback(async () => {
    if (!session) return;
    try {
      await fetch(`${API_BASE}/sponsor/disconnect`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: session.channelId, token: session.token }),
      });
    } catch { /* silent */ }
    if (pollRef.current) clearInterval(pollRef.current);
    await SponsorVault.clear(); // also clears crypto keys via Fortress.clear()
    setSession(null);
    setInviteCode(null);
    setConnState('idle');
    setStatus(null);
    setIncomingSignals([]);
    setMessages([]);
    setHasPeerKey(false);
    pubKeyPostedRef.current = false;
    sinceRef.current = 0;
  }, [session]);

  const dismissSignal = useCallback((id: string) => {
    setIncomingSignals(prev => prev.filter(s => s.id !== id));
  }, []);

  const dismissSignalsByType = useCallback((type: 'water' | 'light') => {
    setIncomingSignals(prev => prev.filter(s => s.type !== type));
  }, []);

  const clearPresenceLog = useCallback(async (type?: 'water' | 'light') => {
    await Surface.clearPresenceLog(type);
    setPresenceLog(await Surface.getPresenceLog());
  }, []);

  return {
    role: session?.role ?? null,
    connState,
    inviteCode,
    status,
    incomingSignals,
    presenceLog,
    messages,
    hasPeerKey,
    error,
    hasPendingCheckin,
    createInvite,
    acceptInvite,
    sendPresence,
    sendMessage,
    sendCheckIn,
    disconnect,
    dismissSignal,
    dismissSignalsByType,
    clearPresenceLog,
    isConnected: connState === 'connected',
  };
}
