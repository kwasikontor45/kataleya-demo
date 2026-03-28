import { Router, type IRouter } from "express";
import { randomBytes, randomUUID } from "crypto";
import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from "fs";
import { join, dirname } from "path";

const router: IRouter = Router();

// ─── Channel persistence ─────────────────────────────────────────────────────
// Channels are written to a JSON file after every mutation.
// On startup the file is read back — server restarts become invisible to users.
// The file contains no health data: only tokens, invite codes, orchid labels,
// milestone counts, check-in dates, presence signal types, encrypted message
// blobs (ciphertext+nonce only), and X25519 public keys.
// All of this is already visible to the relay server in normal operation.

const PERSIST_PATH = join(dirname(new URL(import.meta.url).pathname), "../../data/channels.json");

function ensureDataDir() {
  const dir = dirname(PERSIST_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    flushChannels();
  }, 800);
}

function flushChannels() {
  try {
    ensureDataDir();
    const now = Date.now();
    const payload = Array.from(channels.values()).filter(ch => ch.expiresAt > now);
    const tmp = PERSIST_PATH + ".tmp";
    writeFileSync(tmp, JSON.stringify(payload, null, 0), "utf8");
    renameSync(tmp, PERSIST_PATH);
  } catch (e) {
    console.error("[persist] write failed:", e);
  }
}

function loadPersistedChannels() {
  try {
    if (!existsSync(PERSIST_PATH)) return;
    const raw = readFileSync(PERSIST_PATH, "utf8");
    const list: Channel[] = JSON.parse(raw);
    const now = Date.now();
    let loaded = 0;
    for (const ch of list) {
      if (ch.expiresAt <= now) continue;
      channels.set(ch.id, ch);
      codeIndex.set(ch.inviteCode, ch.id);
      loaded++;
    }
    if (loaded > 0) {
      console.log(`[persist] Restored ${loaded} channel(s) from disk at startup`);
    }
  } catch (e) {
    console.error("[persist] load failed (starting fresh):", e);
  }
}

// ─── In-memory store ────────────────────────────────────────────────────────
interface PresenceSignal {
  id: string;
  type: "water" | "light";
  from: "user" | "sponsor";
  timestamp: number;
  seen: boolean;
}

interface EncryptedMessage {
  id: string;
  from: "user" | "sponsor";
  ciphertext: string;
  nonce: string;
  timestamp: number;
}

interface Channel {
  id: string;
  inviteCode: string;
  userToken: string;
  sponsorToken: string | null;
  connected: boolean;
  checkedIn: boolean;
  checkedInDate: string | null;
  orchidStage: string;
  milestones: number;
  presenceQueue: PresenceSignal[];
  messageQueue: EncryptedMessage[];
  userPubKey: string | null;
  sponsorPubKey: string | null;
  createdAt: number;
  expiresAt: number;
}

const channels = new Map<string, Channel>();
const codeIndex = new Map<string, string>(); // inviteCode -> channelId

// Restore persisted state immediately on module load.
loadPersistedChannels();

// ─── Per-token rate limiting ─────────────────────────────────────────────────
// Each token gets its own window. Limits are per-token, not global, so a
// misbehaving client cannot affect other channels.
interface RateEntry {
  count: number;
  windowStart: number;
}

const pollRates     = new Map<string, RateEntry>(); // 30 req / 60s per token
const presenceRates = new Map<string, RateEntry>(); // 10 req / 60s per token
const checkinRates  = new Map<string, RateEntry>(); //  5 req / 60s per token
const messageRates  = new Map<string, RateEntry>(); // 20 req / 60s per token

function checkRate(
  map: Map<string, RateEntry>,
  token: string,
  limit: number,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const entry = map.get(token);

  if (!entry || now - entry.windowStart >= windowMs) {
    map.set(token, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

function cleanRateMaps(activeTokens: Set<string>) {
  for (const map of [pollRates, presenceRates, checkinRates, messageRates]) {
    for (const token of map.keys()) {
      if (!activeTokens.has(token)) map.delete(token);
    }
  }
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

function generateToken(): string {
  return randomBytes(24).toString("hex");
}

function cleanExpired(): number {
  const now = Date.now();
  const activeTokens = new Set<string>();
  let pruned = 0;

  for (const [id, ch] of channels) {
    if (!ch.connected && ch.expiresAt < now) {
      codeIndex.delete(ch.inviteCode);
      channels.delete(id);
      pruned++;
    } else {
      activeTokens.add(ch.userToken);
      if (ch.sponsorToken) activeTokens.add(ch.sponsorToken);
    }
  }

  cleanRateMaps(activeTokens);
  return pruned;
}

// Periodic GC — runs every 5 minutes. Prunes expired channels from memory
// and from the persisted file.
setInterval(() => {
  const pruned = cleanExpired();
  if (pruned > 0) {
    console.log(`[GC] Pruned ${pruned} expired channel(s) at ${new Date().toISOString()}`);
    flushChannels();
  }
}, 5 * 60 * 1000);

// ─── Routes ─────────────────────────────────────────────────────────────────

// POST /api/sponsor/invite  →  create invite, return code + tokens
router.post("/sponsor/invite", (_req, res) => {
  cleanExpired();
  const channelId = randomUUID();
  const inviteCode = generateCode();
  const userToken = generateToken();

  const channel: Channel = {
    id: channelId,
    inviteCode,
    userToken,
    sponsorToken: null,
    connected: false,
    checkedIn: false,
    checkedInDate: null,
    orchidStage: "seedling",
    milestones: 0,
    presenceQueue: [],
    messageQueue: [],
    userPubKey: null,
    sponsorPubKey: null,
    createdAt: Date.now(),
    expiresAt: Date.now() + 48 * 60 * 60 * 1000,
  };

  channels.set(channelId, channel);
  codeIndex.set(inviteCode, channelId);
  scheduleSave();

  res.json({ channelId, inviteCode, userToken });
});

// POST /api/sponsor/accept  →  sponsor enters code, channel connects
router.post("/sponsor/accept", (req, res) => {
  const { inviteCode } = req.body as { inviteCode?: string };
  if (!inviteCode) { res.status(400).json({ error: "inviteCode required" }); return; }

  const code = inviteCode.toUpperCase().trim();
  const channelId = codeIndex.get(code);
  if (!channelId) { res.status(404).json({ error: "Code not found or expired" }); return; }

  const channel = channels.get(channelId);
  if (!channel) { res.status(404).json({ error: "Channel not found" }); return; }
  if (channel.connected) { res.status(409).json({ error: "Channel already in use" }); return; }

  const sponsorToken = generateToken();
  channel.sponsorToken = sponsorToken;
  channel.connected = true;
  channel.expiresAt = Date.now() + 90 * 24 * 60 * 60 * 1000;
  scheduleSave();

  res.json({ channelId, sponsorToken, inviteCode: code });
});

// POST /api/sponsor/presence  →  send water or light
router.post("/sponsor/presence", (req, res) => {
  const { channelId, token, type } = req.body as {
    channelId?: string;
    token?: string;
    type?: "water" | "light";
  };
  if (!channelId || !token || !type) { res.status(400).json({ error: "channelId, token, type required" }); return; }
  if (!["water", "light"].includes(type)) { res.status(400).json({ error: "type must be water or light" }); return; }

  if (!checkRate(presenceRates, token, 10)) {
    res.status(429).json({ error: "Too many presence signals — slow down" }); return;
  }

  const channel = channels.get(channelId);
  if (!channel || !channel.connected) { res.status(404).json({ error: "Channel not found" }); return; }

  const isUser = token === channel.userToken;
  const isSponsor = token === channel.sponsorToken;
  if (!isUser && !isSponsor) { res.status(403).json({ error: "Invalid token" }); return; }

  const signal: PresenceSignal = {
    id: randomUUID(),
    type,
    from: isUser ? "user" : "sponsor",
    timestamp: Date.now(),
    seen: false,
  };

  channel.presenceQueue.push(signal);
  if (channel.presenceQueue.length > 50) {
    channel.presenceQueue = channel.presenceQueue.slice(-50);
  }
  scheduleSave();

  res.json({ ok: true, signalId: signal.id });
});

// POST /api/sponsor/checkin  →  user marks checked in
router.post("/sponsor/checkin", (req, res) => {
  const { channelId, token, date } = req.body as {
    channelId?: string;
    token?: string;
    date?: string;
  };
  if (!channelId || !token) { res.status(400).json({ error: "channelId, token required" }); return; }

  if (!checkRate(checkinRates, token, 5)) {
    res.status(429).json({ error: "Too many check-in attempts" }); return;
  }

  const channel = channels.get(channelId);
  if (!channel) { res.status(404).json({ error: "Channel not found" }); return; }
  if (token !== channel.userToken) { res.status(403).json({ error: "Invalid token" }); return; }

  channel.checkedIn = true;
  channel.checkedInDate = date ?? new Date().toDateString();
  scheduleSave();

  res.json({ ok: true });
});

// POST /api/sponsor/update  →  user pushes orchid stage + milestone count
router.post("/sponsor/update", (req, res) => {
  const { channelId, token, orchidStage, milestones } = req.body as {
    channelId?: string;
    token?: string;
    orchidStage?: string;
    milestones?: number;
  };
  if (!channelId || !token) { res.status(400).json({ error: "channelId, token required" }); return; }

  const channel = channels.get(channelId);
  if (!channel) { res.status(404).json({ error: "Channel not found" }); return; }
  if (token !== channel.userToken) { res.status(403).json({ error: "Invalid token" }); return; }

  if (orchidStage) channel.orchidStage = orchidStage;
  if (typeof milestones === "number") channel.milestones = milestones;
  scheduleSave();

  res.json({ ok: true });
});

// POST /api/sponsor/pubkey  →  store this device's X25519 public key
router.post("/sponsor/pubkey", (req, res) => {
  const { channelId, token, publicKey } = req.body as {
    channelId?: string;
    token?: string;
    publicKey?: string;
  };
  if (!channelId || !token || !publicKey) {
    res.status(400).json({ error: "channelId, token, publicKey required" }); return;
  }

  const channel = channels.get(channelId);
  if (!channel || !channel.connected) { res.status(404).json({ error: "Channel not found" }); return; }

  const isUser = token === channel.userToken;
  const isSponsor = token === channel.sponsorToken;
  if (!isUser && !isSponsor) { res.status(403).json({ error: "Invalid token" }); return; }

  if (isUser) channel.userPubKey = publicKey;
  else channel.sponsorPubKey = publicKey;
  scheduleSave();

  res.json({ ok: true });
});

// POST /api/sponsor/message  →  relay an encrypted message blob
router.post("/sponsor/message", (req, res) => {
  const { channelId, token, ciphertext, nonce } = req.body as {
    channelId?: string;
    token?: string;
    ciphertext?: string;
    nonce?: string;
  };
  if (!channelId || !token || !ciphertext || !nonce) {
    res.status(400).json({ error: "channelId, token, ciphertext, nonce required" }); return;
  }

  if (!checkRate(messageRates, token, 20)) {
    res.status(429).json({ error: "Too many messages — slow down" }); return;
  }

  const channel = channels.get(channelId);
  if (!channel || !channel.connected) { res.status(404).json({ error: "Channel not found" }); return; }

  const isUser = token === channel.userToken;
  const isSponsor = token === channel.sponsorToken;
  if (!isUser && !isSponsor) { res.status(403).json({ error: "Invalid token" }); return; }

  const msg: EncryptedMessage = {
    id: randomUUID(),
    from: isUser ? "user" : "sponsor",
    ciphertext,
    nonce,
    timestamp: Date.now(),
  };

  channel.messageQueue.push(msg);
  if (channel.messageQueue.length > 200) {
    channel.messageQueue = channel.messageQueue.slice(-200);
  }
  scheduleSave();

  res.json({ ok: true, messageId: msg.id });
});

// GET /api/sponsor/poll?channelId=...&token=...&since=...
router.get("/sponsor/poll", (req, res) => {
  const { channelId, token, since } = req.query as Record<string, string>;
  if (!channelId || !token) { res.status(400).json({ error: "channelId, token required" }); return; }

  if (!checkRate(pollRates, token, 30)) {
    res.status(429).json({ error: "Too many poll requests — client is polling too fast" }); return;
  }

  const channel = channels.get(channelId);
  if (!channel) { res.status(404).json({ error: "Channel not found" }); return; }

  const isUser = token === channel.userToken;
  const isSponsor = token === channel.sponsorToken;
  if (!isUser && !isSponsor) { res.status(403).json({ error: "Invalid token" }); return; }

  const sinceMs = since ? parseInt(since, 10) : 0;
  const myRole = isUser ? "user" : "sponsor";

  const incoming = channel.presenceQueue.filter(
    s => s.from !== myRole && s.timestamp > sinceMs && !s.seen
  );
  for (const s of incoming) s.seen = true;

  const newMessages = channel.messageQueue.filter(
    m => m.from !== myRole && m.timestamp > sinceMs
  );

  const peerPubKey = isUser ? channel.sponsorPubKey : channel.userPubKey;

  const status = {
    connected: channel.connected,
    checkedIn: channel.checkedIn,
    checkedInDate: channel.checkedInDate,
    orchidStage: channel.orchidStage,
    milestones: channel.milestones,
    sponsorPresent: channel.sponsorToken !== null,
  };

  res.json({ signals: incoming, messages: newMessages, peerPubKey, status, serverTime: Date.now() });
});

// DELETE /api/sponsor/disconnect
router.delete("/sponsor/disconnect", (req, res) => {
  const { channelId, token } = req.body as { channelId?: string; token?: string };
  if (!channelId || !token) { res.status(400).json({ error: "channelId, token required" }); return; }

  const channel = channels.get(channelId);
  if (!channel) { res.status(404).json({ error: "Channel not found" }); return; }
  if (token !== channel.userToken && token !== channel.sponsorToken) {
    res.status(403).json({ error: "Invalid token" }); return;
  }

  codeIndex.delete(channel.inviteCode);
  channels.delete(channelId);
  flushChannels();

  res.json({ ok: true });
});

export default router;
