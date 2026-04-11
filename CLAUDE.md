# CLAUDE.md — Kataleya
# Lead Developer context. Read this before touching anything.
# Last updated: April 11 2026

---

## identity

Kataleya is a privacy-first recovery companion. Not a tracking app. Not a clinical tool. A sanctuary.

The one moment it exists for: someone at 2am reaches for the app instead of the other thing.

**The app should know as little about you as possible.**

---

## accounts and identifiers

- GitHub: github.com/kwasikontor45/kataleya
- Expo account: bleedin6ed6e
- EAS project ID: 8c2a466b-748a-4eb5-a42e-4f0bdb9aa856
- Project root: ~/kataleya/artifacts/kataleya-app
- Package manager: pnpm
- Base44 prototype: https://kataleya-9011e6eb.base44.app (reference only)

---

## tech stack

- Expo SDK 54, React Native, TypeScript
- expo-router (file-based routing)
- expo-sqlite (JSI — EAS only, dormant in Expo Go)
- expo-secure-store
- AsyncStorage
- react-native-quick-crypto (NitroModules — EAS only, expected warning in Expo Go)
- pnpm workspace

---

## three-vault architecture

| Vault | Storage | Contents |
|---|---|---|
| Surface | AsyncStorage | preferences, sobriety date, onboarding state |
| Sanctuary | SQLite | mood logs, journal entries, circadian events |
| Fortress | OS Keychain | sponsor credentials, encryption keys |

---

## file structure (key paths)

```
~/kataleya/artifacts/kataleya-app/
  app/
    bridge.tsx          — arrival screen (every session)
    cover.tsx           — 2am / panic screen
    onboarding.tsx      — 7-step onboarding
    burn.tsx            — burn ritual wrapper
    (tabs)/
      index.tsx         — home screen (sanctuary)
      journal.tsx       — mood + journal
      vault.tsx         — privacy, export, burn
      sponsor.tsx       — sponsor connection
  components/
    GhostPulseOrb.tsx   — central orb, BPM engine, ..: :.. glyph
    OuroborosRing.tsx   — never-closing ring, scar marks, segment ticks
    NeonCard.tsx        — glassmorphism card, noise texture, scar wear
    BreathingExercise.tsx — 4-7-8, tap to begin, you did well
    GroundingExercise.tsx — 5-4-3-2-1
    BurningRitual.tsx   — hold to ignite, one step
    HoldToConfirm.tsx   — reusable hold gesture
    typewriter-text.tsx — app choosing its words, character by character
    GlyphIcon.tsx       — SVG icon system
  hooks/
    use-user-state.ts   — adaptive engine, four states
    useCircadian.ts     — phase, theme, darkOverride
    useSobriety.ts      — daysSober, milestones, progress
    useOrchidSway.ts    — accelerometer restlessness score
    useResponsiveHeart.ts — BPM calculation
  constants/
    theme.ts            — Ouroboros Protocol palette
    circadian.ts        — phase config, timing functions
  assets/
    images/
      butterfly-dna.gif   — original, black background
      butterfly-dna-t.gif — transparent background (online tool, fuzz 12%)
    audio/
      kataleya-narration-full.mp3  — Amor Fati full (ElevenLabs, speed 0.82)
      kataleya-narration-cover.mp3 — cover short version
  utils/
    storage.ts          — Surface / Sanctuary / Fortress APIs
    backup.ts           — AES-256 encrypt/decrypt (EAS only)
```

---

## design philosophy

### the two languages
**Code speaks Ouroboros** — void · desire · renewal · choice, scar marks, never-closing ring, Null Black, STATE_CONFIG internals, phase names in code.

**User experiences the garden** — morning / afternoon / evening / night, seasons not streaks, the garden doesn't judge the winter, warm organic language.

### the design principle — everything answers to this
> "Does this feel like it's alive, or does it feel like it was placed here?"

### breathing UI rules
- Nothing fully static when idle — something always moves
- No hard edges — borders suggest, not frame
- Color is atmospheric temperature, not information
- Transitions organic — things emerge and recede
- Tab bar nearly invisible when idle
- Cards are fields, not boxes

### the 2am principle
> Someone at 2am reaches for the app instead of the other thing.
> The app meets them. No menu. No options. Just the orb breathing
> and one quiet line that already knows what time it is.

---

## Ouroboros Protocol — color system

| Name | Hex | RGB | Phase |
|---|---|---|---|
| Null Black | #050508 | — | base, all phases |
| Choice Cyan | #00d4aa | 0,212,170 | dawn |
| Day Cyan | #00ecc4 | 0,236,196 | day |
| Craving Amber | #ff6b35 | 255,107,53 | golden hour |
| Resolve Violet | #8a5fe0 | 138,95,224 | night (pulled back) |
| Scar Silver | #8a8a9e | 138,138,158 | scar marks |

Phase mapping (internal → user-facing):
- void = night
- desire = evening / golden hour
- renewal = morning / dawn
- choice = afternoon / day

---

## components — key behaviours

### GhostPulseOrb
- Central orb on home screen
- ..: :.. heartbeat glyph at core (butterfly removed from here)
- Size floor: 82px (day 0), grows to 130px (year 1)
- Always breathing — restlessness only accelerates, never removes pulse
- BPM from useResponsiveHeart drives core pulse speed
- butterfly-dna.gif NOT here — do not add it back

### OuroborosRing
- Never closes — always a gap (14%)
- Gap edge markers — two bright marks flanking break
- Segment ticks — EVE Online style, 32 around circumference
- Scar marks every 3 days sober, max 12 visible
- Phase rotation speed: desire=8000ms, day=10000ms, dawn=14000ms, void=22000ms
- showDots prop — false on cover screen, true on home
- Breathing scale animation

### NeonCard
- Glassmorphism with SVG feTurbulence noise texture
- Ambient shimmer loop
- Scar marks from cycleCount prop
- Same API as before — drop-in replacement

### TypewriterText
- Reusable component — app choosing its words
- Character by character, irregular timing
- Punctuation adds pause (. = 140ms extra, , = 80ms)
- Used on: bridge phrase, cover phrase
- Props: text, speed (default 45ms), jitter (default 28ms), startDelay, onComplete, style

### BreathingExercise
- 4-7-8 true timing (4 inhale / 7 hold / 8 exhale)
- Tap orb core to begin — no autostart
- "you did well" appears after 2 cycles — ambient text, not button
- Orb keeps slow ambient breath after completion
- ✕ always visible — closes immediately
- No auto-dismiss timer

### BurningRitual
- One step — hold to ignite, done
- Three-phase burn code untouched (tombstone → SQLite/Fortress → Surface)
- No reason selection, no confirmation gate
- Post-burn: "the garden has burned" + "begin again"

---

## user journey — three modes

**Mode 1 — Arriving (bridge)**
OuroborosRing turning, phase whisper, butterfly at center, garden phrase types in, one action: enter.

**Mode 2 — Present (home)**
Orb at center, quick-slots below, timer and milestone progress, everything returns to home.

**Mode 3 — 2am (cover)**
Reached via: kataleya pill long press, orb tap at void phase, sanctuary quick-slot.
Orb breathing, butterfly in dark, rain (void only), neon edge bleeds, phrase types on tap.

---

## circadian phases

| Phase | Time | Display | Internal | Accent |
|---|---|---|---|---|
| dawn | 05:00–08:00 | morning | renewal | cyan |
| day | 08:00–17:00 | afternoon | choice | bright cyan |
| goldenHour | 17:00–20:00 | evening | desire | amber |
| night | 20:00–05:00 | night | void | violet |

Override pill: tap → forces night/void. Shows "◗ night mode" when active. Hint: "following circadian rhythm".

---

## adaptive engine — use-user-state

Four states: struggling · stable · thriving · rest

- **rest** — void phase after 22:00 — minimal UI, orb slowest
- **struggling** — avg mood ≤ 4.0 or phase mood low or trending down
- **thriving** — avg mood ≥ 7.0, ≥3 days sober, not trending down
- **stable** — everything else

STATE_CONFIG drives: orbPulseSpeed, orbOpacity, bgIntensity, greeting pool.
Wired into home screen — is2am detection, orb tappable at void, quick-slots fade when struggling.

---

## GhostPulse — biofeedback layer

The ghost heartbeat. BPM derived from:
- Circadian phase (night slower, day slightly elevated)
- Restlessness score from accelerometer (useOrchidSway)
- Mood score (partially implemented — close the loop)

BPM range: 45–78. Drives orb ring pulse speed and breathing exercise timing.
When dormant: fixed slow rate. When active: mirrors and regulates internal state.

**Gap to close:** mood avg → BPM calculation. Once wired, mood logged → state updated → BPM shifts → orb responds → breathing exercise inherits rhythm.

---

## known issues / pending fixes

- "1 days" plural — fix applied, verify on device
- BreathingExercise hasStarted ref — may need useState for beginHint visibility
- OuroborosRing gap — 14%, verify reads as open on device
- ..: :.. glyph vertical centering — includeFontPadding fix applied
- SVG filter warnings (FeTurbulence etc) — expected in Expo Go, not errors
- NitroModules warning — expected in Expo Go, EAS only

---

## build order (immediate)

1. ~~Bridge screen~~ ✅ done
2. Onboarding exit screen — three things: breathe / check in / reach sponsor
3. Sponsor tab first impression — "your sponsor is one tap away"
4. GhostPulse ← mood score — close the feedback loop
5. 3D depth full pass (see below)
6. Railway fresh deploy
7. EAS build Android first
8. EAS build iOS
9. Store listings

---

## 3D depth layer (full pass — priority feature)

- **Parallax** — orb 30% slower than scroll, background 10% slower than orb
- **Light sourcing** — one source per phase. Dawn = top left. Void = from below. Desire = warm side amber. Orb gets phase-directional gradient.
- **Press depth** — quick-slots push away on tap (scale down + dim), spring back on release
- **OuroborosRing perspective tilt** — subtle rotateY, reads as halo in space not flat circle
- **Z-depth opacity** — ambient 40%, orb 75%, quick-slots 90%, text 100%
- **Reactive depth** — every interactive element comes toward you on tap

---

## gameplan — v3.0 (deferred)

- **Rewrite Ritual** — replaces burn UX (burn code stays)
  - CONFESSION: user writes what they would erase
  - TRANSMUTATION: text glitches, helix unzips, DNA strands separate
  - INTEGRATION: scar joins OuroborosRing permanently, data gone, mark remains
- **Helix unzipping** — butterfly-dna frames 1→33 for loading states, burn transmutation
- **Paywall** — PAYWALL_ACTIVE=false, do not touch, subscription infrastructure complete
- **Clinical validation pilot** — 3-5 therapists, 6-8 weeks

---

## assets

- butterfly-dna.gif — original, black background, cover screen
- butterfly-dna-t.gif — transparent (fuzz 12%, online tool), cover screen orb
- Do NOT remove or replace either
- Do NOT add butterfly back to GhostPulseOrb
- Audio files in assets/audio/ — wired to EAS build only

---

## working rules

- One file at a time. test → commit → next.
- kebab-case file names always, no exceptions
- snake_case only when platform forces it
- Never generic emojis in UI — CourierPrime glyphs only
- Never transmit user health data to any server
- Blind relay only — server sees ciphertext, nothing else
- PAYWALL_ACTIVE=false — do not enable
- butterfly-dna.gif and butterfly-dna-t.gif — do NOT touch
- expo-av and expo-audio broken in Expo Go SDK 54 — audio deferred to EAS
- react-native-quick-crypto NitroModules warning in Expo Go — expected, not a crash

---

## railway (pending)

Previous project deleted. Needs fresh deploy.
Blind relay server — sees ciphertext only, nothing else.
Required env vars: PORT, DATA_DIR
Required: /health endpoint, Volume at /data for channels.json persistence
Server code: ~/kataleya/exports/ or ~/kataleya/lib/

---

## clinician materials

- kataleya-clinician.html — print-ready one-pager for therapist pitch
- Pilot program: 3-5 therapists, 5-10 clients, 6-8 weeks, qualitative only
- Key pitch: "the app meets your client at 2am when you can't"
- Privacy guarantee: zero HIPAA obligation, no data leaves device
