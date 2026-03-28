import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { SponsorVault, Surface } from '@/utils/storage';

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

export function useSponsorChannel() {
  const [session, setSession] = useState<ChannelSession | null>(null);
  const [connState, setConnState] = useState<ConnState>('idle');
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [status, setStatus] = useState<ChannelStatus | null>(null);
  const [incomingSignals, setIncomingSignals] = useState<PresenceSignal[]>([]);
  const [presenceLog, setPresenceLog] = useState<PresenceLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sinceRef = useRef<number>(0);

  // ── Load persisted session + presence log on mount ───────────────────────
  useEffect(() => {
    SponsorVault.getChannel().then(async ch => {
      if (!ch) return;
      const since = await SponsorVault.getLastPoll();
      sinceRef.current = since;
      setSession(ch);
      setConnState('connected');
    });
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
        const data = await res.json() as { signals: PresenceSignal[]; status: ChannelStatus; serverTime: number };
        if (data.signals?.length) {
          setIncomingSignals(prev => [...prev, ...data.signals]);
          // Persist to presence log so signals survive app restart
          const entries: PresenceLogEntry[] = data.signals.map(s => ({
            id: s.id, type: s.type, timestamp: s.timestamp,
          }));
          await Surface.appendPresenceLog(entries);
          setPresenceLog(await Surface.getPresenceLog());
          sinceRef.current = data.serverTime;
          await SponsorVault.setLastPoll(data.serverTime);
        }
        if (data.status) {
          setStatus(data.status);
          // Transition inviting → connected when sponsor joins
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
    // Poll while waiting for sponsor to join (inviting) AND while fully connected
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
      await SponsorVault.setInviteCode(data.inviteCode);
      await SponsorVault.setChannel(data.channelId, data.userToken, 'user');
      setSession(sess);
      setInviteCode(data.inviteCode);
      setConnState('inviting');
    } catch (e: unknown) {
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
      await SponsorVault.setChannel(data.channelId, data.sponsorToken, 'sponsor');
      await SponsorVault.setInviteCode(data.inviteCode);
      setSession(sess);
      setInviteCode(data.inviteCode);
      setConnState('connected');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid code';
      setError(msg);
    }
  }, []);

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

  const [hasPendingCheckin, setHasPendingCheckin] = useState(false);

  // Attempt to flush a queued offline check-in.
  const replayPendingCheckin = useCallback(async (sess: ChannelSession) => {
    const pending = await Surface.getPendingCheckin();
    if (!pending) return;
    // Discard stale (> 24 h) queued check-ins
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
      // Clear any queued check-in on success
      await Surface.clearPendingCheckin();
      setHasPendingCheckin(false);
    } catch {
      // Queue for replay when back online
      await Surface.setPendingCheckin({ ts: Date.now(), orchidStage, milestones });
      setHasPendingCheckin(true);
    }
  }, [session]);

  // ── Pending check-in state management ────────────────────────────────────
  // Named function so the same async check can be called on mount, after
  // replay, and after sendCheckIn — always from the resolved value, never
  // from a synchronous Promise reference.
  const checkQueueStatus = useCallback(async () => {
    const pending = await Surface.getPendingCheckin();
    setHasPendingCheckin(!!pending);
  }, []);

  // ── Replay pending check-in on app foreground ─────────────────────────────
  useEffect(() => {
    if (!session) return;
    checkQueueStatus(); // Initial check on mount
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        replayPendingCheckin(session);
      }
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
    await SponsorVault.clear();
    setSession(null);
    setInviteCode(null);
    setConnState('idle');
    setStatus(null);
    setIncomingSignals([]);
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
    error,
    hasPendingCheckin,
    createInvite,
    acceptInvite,
    sendPresence,
    sendCheckIn,
    disconnect,
    dismissSignal,
    dismissSignalsByType,
    clearPresenceLog,
    isConnected: connState === 'connected',
  };
}
