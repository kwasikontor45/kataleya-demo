import { Router, type IRouter } from "express";
import { randomBytes, randomUUID } from "crypto";

const router: IRouter = Router();

// ─── In-memory store ────────────────────────────────────────────────────────
interface PresenceSignal {
  id: string;
  type: "water" | "light";
  from: "user" | "sponsor";
  timestamp: number;
  seen: boolean;
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
  createdAt: number;
  expiresAt: number;
}

const channels = new Map<string, Channel>();
const codeIndex = new Map<string, string>(); // inviteCode -> channelId

// ─── Per-token rate limiting ─────────────────────────────────────────────────
// Each token gets its own window. Limits are per-token, not global, so a
// misbehaving client cannot affect other channels.
interface RateEntry {
  count: number;
  windowStart: number;
}

// Separate maps per endpoint so limits are independently configurable.
const pollRates     = new Map<string, RateEntry>(); // 30 req / 60s per token
const presenceRates = new Map<string, RateEntry>(); // 10 req / 60s per token
const checkinRates  = new Map<string, RateEntry>(); //  5 req / 60s per token

function checkRate(
  map: Map<string, RateEntry>,
  token: string,
  limit: number,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const entry = map.get(token);

  if (!entry || now - entry.windowStart >= windowMs) {
    // New window
    map.set(token, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= limit) {
    return false; // rate-limited
  }

  entry.count++;
  return true;
}

// Prune rate entries for tokens that no longer exist in any channel.
// Called alongside channel expiry cleanup.
function cleanRateMaps(activeTokens: Set<string>) {
  for (const map of [pollRates, presenceRates, checkinRates]) {
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

// Periodic GC — runs every 5 minutes regardless of request activity.
// Without this, rate-limit maps for long-idle sessions accumulate unboundedly.
// Only emits a log line when something was actually pruned (no log spam).
setInterval(() => {
  const pruned = cleanExpired();
  if (pruned > 0) {
    console.log(`[GC] Pruned ${pruned} expired channel(s) at ${new Date().toISOString()}`);
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
    createdAt: Date.now(),
    expiresAt: Date.now() + 48 * 60 * 60 * 1000,
  };

  channels.set(channelId, channel);
  codeIndex.set(inviteCode, channelId);

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
  // Extend expiry now that connected
  channel.expiresAt = Date.now() + 90 * 24 * 60 * 60 * 1000;

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

  // Rate limit: 10 presence signals per 60s per token
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
  // Keep queue bounded
  if (channel.presenceQueue.length > 50) {
    channel.presenceQueue = channel.presenceQueue.slice(-50);
  }

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

  // Rate limit: 5 check-ins per 60s per token (should be once per day; this is generous)
  if (!checkRate(checkinRates, token, 5)) {
    res.status(429).json({ error: "Too many check-in attempts" }); return;
  }

  const channel = channels.get(channelId);
  if (!channel) { res.status(404).json({ error: "Channel not found" }); return; }
  if (token !== channel.userToken) { res.status(403).json({ error: "Invalid token" }); return; }

  channel.checkedIn = true;
  channel.checkedInDate = date ?? new Date().toDateString();
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
  res.json({ ok: true });
});

// GET /api/sponsor/poll?channelId=...&token=...&since=...
router.get("/sponsor/poll", (req, res) => {
  const { channelId, token, since } = req.query as Record<string, string>;
  if (!channelId || !token) { res.status(400).json({ error: "channelId, token required" }); return; }

  // Rate limit: 30 polls per 60s per token.
  // Normal client interval is 5s = 12 req/min. Limit is 2.5× that.
  // A legitimate client will never hit this; a hammering client will be blocked
  // per-token, leaving other channels unaffected.
  if (!checkRate(pollRates, token, 30)) {
    res.status(429).json({ error: "Too many poll requests — client is polling too fast" }); return;
  }

  const channel = channels.get(channelId);
  if (!channel) { res.status(404).json({ error: "Channel not found" }); return; }

  const isUser = token === channel.userToken;
  const isSponsor = token === channel.sponsorToken;
  if (!isUser && !isSponsor) { res.status(403).json({ error: "Invalid token" }); return; }

  const sinceMs = since ? parseInt(since, 10) : 0;

  // Return signals addressed to this role that arrived after `since`
  const myRole = isUser ? "user" : "sponsor";
  const incoming = channel.presenceQueue.filter(
    s => s.from !== myRole && s.timestamp > sinceMs && !s.seen
  );

  // Mark as seen
  for (const s of incoming) s.seen = true;

  const status = {
    connected: channel.connected,
    checkedIn: channel.checkedIn,
    checkedInDate: channel.checkedInDate,
    orchidStage: channel.orchidStage,
    milestones: channel.milestones,
    sponsorPresent: channel.sponsorToken !== null,
  };

  res.json({ signals: incoming, status, serverTime: Date.now() });
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
  res.json({ ok: true });
});

export default router;
