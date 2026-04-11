# kataleya — claude code project memory

## what this app is

Kataleya is a privacy-first mobile recovery support app built on Expo SDK 54 (React Native).
It is not a crisis app. It is a living, breathing extension of the user — body, mind, and soul in sync.
The core experience is **adaptive UI**: the app reads the user's state and responds visually and tonally without asking. No pop-ups. No intrusive notifications. Just the app feeling what the user feels.

The soul of kataleya: **presence without monitoring. context-awareness without surveillance.**

---

## railway — blind relay server

The Railway server is NOT a database. It does not store user data.
It runs one job: pass encrypted messages between user and sponsor, then discard them.
The server never sees message content. It is structurally blind by design.
This does NOT violate the privacy-first architecture — it was designed to honor it.

### what the relay does
- receives an encrypted blob from user's phone
- forwards it to sponsor's phone
- immediately discards it
- stores nothing permanently except channels.json (sponsor channel metadata only)

### current status
- Previous Railway project was DELETED due to persistent deploy failures
- Needs a fresh Railway project created and redeployed
- Server code lives in: ~/kataleya/lib/ or ~/kataleya/exports/ (check repo)
- Required env vars: PORT, DATA_DIR
- Required: /health endpoint for Railway health checks
- channels.json must persist via Railway Volume mounted at /data

---

## accounts & identifiers

- GitHub: github.com/kwasikontor45/kataleya
- Expo account: bleedin6ed6e
- EAS project ID: 8c2a466b-748a-4eb5-a42e-4f0bdb9aa856
- Project root: ~/kataleya/artifacts/kataleya-app
- Railway: DELETED — previous deployment had persistent deploy failures. needs to be redeployed fresh.
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
- Railway (Node.js blind relay server) — NEEDS FRESH DEPLOY. Previous project deleted due to deploy failures.
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

---

## vision shift — april 2026

### the mind shift
The visionary has shifted direction. This is intentional and correct.
Garden language is out. Ouroboros Protocol is in.
The app should not look like a standard app with rigid boxes.
It needs to feel like it breathes.

### the design principle — everything answers to this
> "Does this feel like it's alive, or does it feel like it was placed here?"

If it feels placed — it's wrong. If it feels like it emerged — it's right.

### what breathing UI means technically
- Nothing is fully static when idle. Something always moves.
- No hard edges. Borders suggest, not frame.
- Color is atmospheric temperature, not information.
- Transitions are organic — things emerge and recede.
- Text has weight established by space, not just size.
- The tab bar is nearly invisible when idle.
- Cards are not boxes — they are fields.

### ouroboros protocol — language and identity
- Phase names in UI: void · desire · renewal · choice (not night/goldenHour/dawn/day)
- Color names: Null Black · Choice Cyan · Craving Amber · Resolve Violet · Scar Silver
- Milestone language: scars, not badges. Survived cycles, not streaks.
- The ring never closes. Always a gap. Always becoming.
- butterfly-dna.gif stays. Do NOT remove or replace.

### source documents
Two documents inform the entire design direction:

1. **Kataleya — Amor Fati audio script** — the soul document.
   Key line: "Some things don't need to be tracked to be understood."
   This is the onboarding narration. Map each line to each onboarding step.
   It plays as ambient text while the user moves through onboarding.

2. **Personal Sanctuary React component** — shows the interaction model for the cover screen.
   One breathing object. Tap → phrase → fade → silence. No input required.
   This is the 2am moment. The cover screen is this.

### what was just built
- cover.tsx — rebuilt as breathing object. Phase-aware phrases (void/desire/renewal/choice).
  Orb breathes at 9s cycle. Phrase fades in 6s. Return appears after 8s. Nothing asked of user.
- NeonCard.tsx — glassmorphism. Noise texture via SVG feTurbulence. Shimmer. Scar marks from cycleCount.
- OuroborosRing.tsx — new component. Never closes. Scar marks every 3 days sober (max 12).
  Phase-aware rotation speed. Breathing scale.
- circadian.ts — added ouroborosPhase field: void · desire · renewal · choice

### what is being built next (in order)
1. **Onboarding narration** — map audio script lines to 7 onboarding steps.
   Ambient text, not a modal. Appears and fades behind the UI.
2. **Ambient animation layer** — full-screen breathing background behind everything.
   Slower than the orb. The environment itself is alive.
3. **use-user-state.ts** — the adaptive state engine.
   Four states: struggling · stable · thriving · rest.
   Home screen reads this and responds. This is the soul of the experience.
4. **Milestone moments** — when user crosses 7/30/90/365 days, the app feels different.
   Not a notification. Not a badge. The orb behaves differently. One quiet acknowledgment.
5. **Home screen as orbital space** — not cards stacked vertically.
   Orb at center. Content at different depths as user scrolls.
   Physics-based spring transitions, not timing functions.
6. **Tab bar dissolves** — icons only, no labels, very low opacity idle.
   Appears on interaction. Nearly invisible between touches.

### the 2am principle
The moment Kataleya exists for:
> Someone at 2am reaches for the app instead of the other thing.
> The app meets them. No menu. No options. Just the orb breathing
> and one quiet line that already knows what time it is.

Everything is built in service of that moment.

### user journey (three modes)
- **Arriving** — bridge screen. One action: enter. Nothing else.
- **Present** — home screen. Orb at center. Mood, breathe, ground, urge surf orbit it.
- **2am** — cover screen. One breathing object. One phrase. Silence. Return when ready.

### what the app must never be
- A notification machine
- A streak tracker that punishes
- A clinical tool
- A standard app with rigid boxes
- Loud in any way

### railway (still pending)
Previous project deleted. Needs fresh deploy.
Server is blind relay only — sees ciphertext, nothing else.
Required: PORT env var, DATA_DIR env var, /health endpoint, Volume at /data.

### working rules (unchanged)
- one file at a time. test → commit → next.
- kebab-case file names always.
- never generic emojis in UI.
- never transmit user health data to any server.
- blind relay only.
- PAYWALL_ACTIVE=false — do not enable.
- butterfly-dna.gif — do NOT touch.

---

## session update — april 11 2026

### completed this session
- cover.tsx — full rebuild: Blade Runner rain, scanlines, neon edge bleeds, OuroborosRing (no dots), butterfly-dna-t.gif centered in dark orb, garden phrases phase-aware
- GhostPulseOrb — butterfly removed, ..: :.. heartbeat glyph, orb size floor raised to 82px, always breathing not just on shake
- OuroborosRing — segment ticks (EVE Online style), gap widened to 14%, gap edge markers, showDots prop added
- index.tsx — use-user-state wired, is2am detection, orb tappable at void phase, quick-slots Cyberpunk style (breathe/ground/sanctuary), duplicate sanctuary removed, plural days fixed, override pill shows "◗ void" when active / "following circadian rhythm" hint
- use-user-state.ts — garden language greetings, apostrophe fixed
- BreathingExercise — tap to begin (no autostart), "take it with you" on completion, tap anywhere to close, no auto-dismiss timer
- butterfly-dna-t.gif — re-exported with transparent background via online tool, replaces ImageMagick version
- NeonCard — glassmorphism, noise texture, shimmer, scar wear from cycleCount
- theme.ts — night violet pulled back from #9b6dff to #8a5fe0

### pending fixes (known issues)
- "1 days" plural — fix not landing on device, needs verification
- BreathingExercise tap-to-begin — hasStarted.current is a ref, won't trigger re-render for beginHint visibility — may need useState instead
- OuroborosRing on home — still reads as a closed circle to some users despite 14% gap
- GhostPulseOrb ..: :.. glyph vertical alignment — shifted down, includeFontPadding fix applied but needs device check

### current build order (immediate)
1. Verify all patches above on device
2. Bridge screen rebuild — OuroborosRing breathing, phase, one action: enter
3. Onboarding exit screen — three things: breathe, check in, reach sponsor
4. Sponsor tab first impression — "your sponsor is one tap away" before setup
5. GhostPulse BPM ← mood score (close the feedback loop)
6. Railway fresh deploy
7. EAS build Android first

### architecture reminders
- Code speaks Ouroboros — void/desire/renewal/choice, scar marks, never-closing ring
- User experiences the garden — seasons, roots, winter, morning
- butterfly-dna-t.gif on cover screen only — do not add elsewhere
- butterfly-dna.gif (original) — keep in assets, do not delete
- PAYWALL_ACTIVE=false — do not touch
- expo-av and expo-audio both broken in SDK 54 Expo Go — audio deferred to EAS build
- mixBlendMode screen on butterfly removed — transparent gif handles it now

---

## session update — april 11 2026

### completed this session
- cover.tsx — full rebuild: Blade Runner rain, scanlines, neon edge bleeds, OuroborosRing (no dots), butterfly-dna-t.gif centered in dark orb, garden phrases phase-aware
- GhostPulseOrb — butterfly removed, ..: :.. heartbeat glyph, orb size floor raised to 82px, always breathing not just on shake
- OuroborosRing — segment ticks (EVE Online style), gap widened to 14%, gap edge markers, showDots prop added
- index.tsx — use-user-state wired, is2am detection, orb tappable at void phase, quick-slots Cyberpunk style (breathe/ground/sanctuary), duplicate sanctuary removed, plural days fixed, override pill shows "◗ void" when active / "following circadian rhythm" hint
- use-user-state.ts — garden language greetings, apostrophe fixed
- BreathingExercise — tap to begin (no autostart), "take it with you" on completion, tap anywhere to close, no auto-dismiss timer
- butterfly-dna-t.gif — re-exported with transparent background via online tool, replaces ImageMagick version
- NeonCard — glassmorphism, noise texture, shimmer, scar wear from cycleCount
- theme.ts — night violet pulled back from #9b6dff to #8a5fe0

### pending fixes (known issues)
- "1 days" plural — fix not landing on device, needs verification
- BreathingExercise tap-to-begin — hasStarted.current is a ref, won't trigger re-render for beginHint visibility — may need useState instead
- OuroborosRing on home — still reads as a closed circle to some users despite 14% gap
- GhostPulseOrb ..: :.. glyph vertical alignment — shifted down, includeFontPadding fix applied but needs device check

### current build order (immediate)
1. Verify all patches above on device
2. Bridge screen rebuild — OuroborosRing breathing, phase, one action: enter
3. Onboarding exit screen — three things: breathe, check in, reach sponsor
4. Sponsor tab first impression — "your sponsor is one tap away" before setup
5. GhostPulse BPM ← mood score (close the feedback loop)
6. Railway fresh deploy
7. EAS build Android first

### architecture reminders
- Code speaks Ouroboros — void/desire/renewal/choice, scar marks, never-closing ring
- User experiences the garden — seasons, roots, winter, morning
- butterfly-dna-t.gif on cover screen only — do not add elsewhere
- butterfly-dna.gif (original) — keep in assets, do not delete
- PAYWALL_ACTIVE=false — do not touch
- expo-av and expo-audio both broken in SDK 54 Expo Go — audio deferred to EAS build
- mixBlendMode screen on butterfly removed — transparent gif handles it now
