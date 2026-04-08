# kataleya — claude code project memory

## what this app is

Kataleya is a privacy-first mobile recovery support app built on Expo SDK 54 (React Native).
It is not a crisis app. It is a living, breathing extension of the user — body, mind, and soul in sync.
The core experience is **adaptive UI**: the app reads the user's state and responds visually and tonally without asking. No pop-ups. No intrusive notifications. Just the app feeling what the user feels.

The soul of kataleya: **presence without monitoring. context-awareness without surveillance.**

---

## accounts & identifiers

- GitHub: github.com/kwasikontor45/kataleya
- Expo account: bleedin6ed6e
- EAS project ID: 8c2a466b-748a-4eb5-a42e-4f0bdb9aa856
- Project root: ~/kataleya/artifacts/kataleya-app
- Railway: API server (Node.js), blind relay only
- Base44 prototype: https://kataleya-9011e6eb.base44.app (reference UI only — not production)

---

## tech stack

- Expo SDK 54, React Native
- TypeScript throughout
- expo-router (file-based routing, tabs)
- expo-sqlite (JSI — requires EAS build, stripped by Expo Go)
- expo-secure-store
- AsyncStorage
- TweetNaCl (X25519 + XSalsa20-Poly1305) — E2E message encryption
- Railway (Node.js API server)
- channels.json persists via Railway Volume at /data (DATA_DIR env var)
- pnpm workspace

---

## three-vault storage architecture

| vault | storage | purpose |
|---|---|---|
| surface | AsyncStorage | non-sensitive, fast access — name, preferences |
| sanctuary | SQLite (expo-sqlite) | mood logs, journal entries, sobriety data |
| fortress | SecureStore / Keychain | sponsor credentials, encryption keys |

---

## tab structure (app/(tabs)/)

| file | screen | notes |
|---|---|---|
| index.tsx | home | GhostPulseOrb, breathing, mood, urge surf, circadian badge |
| journal.tsx | journal | mood grid, prompt card, journal entries — base44 port complete |
| growth.tsx | growth / progress | streak, milestones, garden language |
| sponsor.tsx | sponsor | blind relay messaging, check-in, presence signals |
| vault.tsx | vault / settings | three-vault interface, burn ritual, privacy FAQ |

---

## key components

| component | purpose |
|---|---|
| GhostPulseOrb | ambient animated orb — 3 staggered rings, BPM-driven. butterfly-dna.gif renders inside the orb core. Do NOT replace with SVG or placeholder. |
| NeonCard | foundation card system — cyan / violet / amber / pink |
| CircadianBadge | live phase indicator — dawn / day / golden hour / night |
| BurningRitual | cryptographic three-phase wipe sequence |
| UrgeSurf | fullscreen modal, ride-the-wave countdown |
| BreathingExercise | staggered ring animation, auto-starts on mount |
| ButterflyCard | shows when avg mood ≤ 4.5 over last 5 logs, dismissible per session |
| HoldToConfirm | hold-to-action button — used for mood record and journal seal |
| AmbientBackground | rain particle ambient layer |

---

## circadian engine

Four phases, locally processed, zero network:

| phase | time window | accent color |
|---|---|---|
| dawn | ~5am–9am | pink |
| day | ~9am–5pm | cyan |
| golden-hour | ~5pm–9pm | amber |
| night | ~9pm–5am | violet |

Engine reads: time of day + accelerometer RMS (restlessness).
Outputs: phase, accentRgb, theme variant.
Used by: every screen, GhostPulseOrb, mood logs, journal prompts, predictive suggestions.

A person in recovery at 2am is not the same person they are at dawn — the engine knows this.

---

## adaptive UI system (in progress — core vision)

Three signal types → one user state → UI behavior.

### signals

- body: circadian phase, accelerometer restlessness, urge log
- mind: mood score, journal entries, streak
- soul: last breathing session, ritual completion, time of day

### user states

| state | trigger | ui response |
|---|---|---|
| struggling | mood ≤ 4, urge active, or night + no breath session | orb pulses slow, rain dims, soft prompt |
| stable | default | normal rhythm, all features visible |
| thriving | mood ≥ 7, streak active, breath done today | butterfly animations, brighter, expansive |
| night-rest | circadian night phase after 10pm | deep dim, breath only, minimal UI |

State engine: `hooks/use-user-state.ts` (to be built in v2.5)
Consumed by: home screen, GhostPulseOrb, circadian badge.

---

## base44 port — features borrowed (in progress)

Base44 is a web prototype used as UI reference only.
We port its best ideas into the Expo codebase one file at a time: test → commit → next.
Never big-bang merges.

| feature | status | target file |
|---|---|---|
| journal prompt card — "need a prompt? / give me one" | ✅ done | journal.tsx |
| mood grid — 3×2 with icons (Calm, Anxious, Stressed, Neutral, Energized, Low) | ✅ done | journal.tsx |
| journal entry cards with mood badge + timestamp | ✅ done | journal.tsx |
| "write freely. no one can read this but you..." placeholder | ✅ done | journal.tsx |
| bold journal header + 🔒 private & encrypted subtitle | ✅ done | journal.tsx |
| privacy FAQ accordion (analytics, HIPAA, push notifications) | 🔲 next | vault.tsx |
| daily reminders onboarding step | 🔲 queued | onboarding.tsx |

---

## visual identity

- App icon: monarch butterfly with DNA double helix on wings — transformation + biology + edge
- butterfly-dna.gif (uploaded asset) lives inside GhostPulseOrb rings — monarch butterfly with DNA helix wings on dark background, amber/burnt-orange. This is the actual app asset, not a placeholder.
- Color language: deep blacks, amber, orchid/violet, rain-blue, soft white
- No clinical UI. No hard edges. Everything breathes.
- Garden language: growth metaphors throughout (seasons not streaks, sealing not saving)
- Cyberpunk direction (v2.5+): Siri-style edge glow, holographic overlays, neon dark variant

---

## cyberpunk visual direction (v2.5+ roadmap)

Inspired by: neon-lit alleyway concept video + Siri ambient glow aesthetic.
Vision: same function, completely different soul — the app feels alive, not clinical.
Not like Siri (voice assistant). Like Siri's *presence* — ambient, aware, never demanding.

| sprint | what |
|---|---|
| v2.5 | cyberpunk dark theme variant, neon NeonCard, typewriter mood text |
| v2.6 | holographic overlay UI on home, animated sensing sequence |
| v3.0 | expo-camera AR mode, live overlay on viewfinder, full cyberpunk onboarding |

Cyberpunk theme colors:
- background: #080808
- cyan neon: #00f5ff
- violet neon: #9b59ff
- amber neon: #ffaa00
- edge glow: Siri-style screen border pulse reactive to circadian phase

---

## naming conventions (strict — no exceptions)

- **kebab-case** for all file names, component files, hook files, style classes
  e.g. `use-user-state.ts`, `ghost-pulse-orb.tsx`, `neon-card.tsx`
- **snake_case** only when the platform or project forces it
- No PascalCase files. No camelCase files. No other conventions. Ever.

---

## subscription / paywall

- Infrastructure complete
- Gated behind `PAYWALL_ACTIVE=false`
- Deferred to v3.0

---

## features requiring EAS build (not Expo Go)

- expo-sqlite (JSI module) — stripped by Expo Go, not a bug
- AES-256 backup
- Android push notifications

These behave as expected in Expo Go. Use EAS build for full functionality.

---

## current version & status

**v2.4** — merge complete, API deployed on Railway, base44 port in progress.

### pre-launch critical path

- [x] Google Play Developer account registered
- [x] Apple Developer account registered
- [x] Railway API deployed
- [x] EAS project ID registered (8c2a466b-748a-4eb5-a42e-4f0bdb9aa856)
- [x] expo-sqlite re-added to app.json plugins
- [x] iOS ITSAppUsesNonExemptEncryption flag added to app.json
- [ ] First EAS build — Android
- [ ] First EAS build — iOS
- [ ] Store listings

---

## how we work

- Brief explanation first, then command block
- One file at a time. Test → commit → next. No big-bang merges.
- Command block format (always end fixes with this):

```bash
cp ~/file.tsx ~/kataleya/artifacts/kataleya-app/path/to/file.tsx
git add -A && git commit -m "fix: description" && git push origin main
```

- kebab-case. always. no exceptions unless forced by platform.
