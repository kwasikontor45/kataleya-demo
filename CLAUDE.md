# CLAUDE.md — Kataleya
# Lead Developer context. Read this before touching anything.
# Last updated: April 11 2026

---

## identity

Kataleya is a privacy-first recovery companion. Not a tracking app. Not a clinical tool. A sanctuary.

The one moment it exists for: someone at 2am reaches for the app instead of the other thing.

**The app should know as little about you as possible.**

---

## origin — where this came from

Kataleya began in March 2026 as a founder's vision of what a recovery app should feel like, not what it should track. The first working code was v2.1 — a complete TypeScript scaffold covering the three-vault storage architecture, the circadian engine, the responsive heart hook, and the burning ritual. That version used Expo SDK 52, `crypto-js` for encryption (since replaced with `react-native-quick-crypto`), and `zustand` for state (since removed — state is hook-local).

**What survived from v2.1 intact:**
- The three-vault names: Surface, Sanctuary, Fortress
- The circadian four-phase structure: dawn, day, goldenHour, night
- The `..: :..` heartbeat glyph as identity symbol
- The BPM logic in `useResponsiveHeart` — mood score → base BPM, phase modifiers, restlessness modifiers
- The burn ritual: hold gesture, irreversible, no reason required
- The SQLite schema with `restlessness` column wired to accelerometer RMS
- The privacy guarantee: health data never leaves the device

**What was fixed before v2.2:**
- `crypto-js` pure JavaScript weak entropy → replaced with native OpenSSL via `react-native-quick-crypto`
- No SQLite migration system → `user_version` PRAGMA added in `utils/db.ts`
- Sequential `await` in restore loop → batched SQLite transactions
- PBKDF2 iteration count hardcoded → reads dynamically from blob (`blob.iters`)
- `BurningRitual.tsx` missing `Fortress` import → fixed
- Restlessness field always zero → wired to live accelerometer RMS from `useOrchidSway`
- No offline check-in queue → added with `AppState` replay on foreground

**What was added in v2.2:**
- Blind relay server (Railway) — sees ciphertext only
- End-to-end encrypted sponsor messages via NaCl (tweetnacl)
- Water and light presence signals
- `GhostPulseOrb` replacing static orchid
- `OuroborosRing` — the never-closing ring, visual identity
- `NeonCard` glassmorphism system
- `TypewriterText` — the app choosing its words
- Bridge screen as arrival ritual, cover screen as 2am panic response
- Ouroboros Protocol color system replacing MorningBloom/MidnightGarden

**The original `..: :..` description (from v2.1, still holds):**
> Analog (chaos) → Threshold (held) → Digital (safe). Every opening = ritual of containment.

**The privacy claim (board documents, March 2026, still holds):**
> "Your mood logs, journal entries, and all health-sensitive data physically cannot leave this device." This is not a policy. It is an architecture constraint.

---

## accounts and identifiers

- GitHub private (source of truth): github.com/kwasikontor45/kataleya
- GitHub public (sanitized demo): github.com/kwasikontor45/kataleya-demo
- Expo account: bleedin6ed6e
- EAS project ID: 8c2a466b-748a-4eb5-a42e-4f0bdb9aa856
- Project root: ~/kataleya/artifacts/kataleya-app
- Package manager: pnpm
- Base44 prototype: https://kataleya-9011e6eb.base44.app (reference only)

---

## repo strategy

Private repo (`kataleya`) is the sole source of truth. All work happens here.
Public repo (`kataleya-demo`) is a sanitized demo — UI components only, no backend or crypto.

Publishing: run `~/bin/kataleya-publish` from private repo root on `main`.
The script strips: `utils/crypto.ts`, `utils/db.ts`, `utils/backup.ts`, `utils/storage.ts`, `hooks/useSponsorChannel.ts`, `server/`, `lib/`, `exports/`, `attached_assets/`, `.claude/`, `.env*`, audio assets.
The `public` remote in the private repo points to `kataleya-demo`.
A verification pass runs before every commit — aborts if sensitive files are detected.
One-way flow only — never merge public back into private.

---

## tech stack

- Expo SDK 54, React Native, TypeScript
- expo-router (file-based routing)
- expo-sqlite (JSI — EAS only, dormant in Expo Go)
- expo-secure-store
- AsyncStorage
- react-native-quick-crypto (NitroModules — EAS only, expected warning in Expo Go)
- expo-linear-gradient (used in NeonCard inner glow)
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
    onboarding.tsx      — 7-step onboarding, exit step: "three things, always here"
    burn.tsx            — burn ritual wrapper
    (tabs)/
      index.tsx         — home screen (sanctuary)
      journal.tsx       — mood + journal + urge surfing, emits moodEvents on save
      vault.tsx         — privacy, export, burn
      sponsor.tsx       — sponsor connection, role-first flow
  components/
    GhostPulseOrb.tsx   — central orb, BPM engine, ..: :.. glyph
    OuroborosRing.tsx   — never-closing ring, scar marks, segment ticks
    NeonCard.tsx        — glass depth card — shadow stack, top edge highlight, inner glow
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
    useResponsiveHeart.ts — BPM calculation, subscribes to moodEvents
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
    mood-event.ts       — pub/sub for mood-logged signal across tabs (no dependencies)

  db schema (current — SCHEMA_VERSION 2):
    mood_logs           — v1 — mood score, restlessness, circadian phase
    journal_entries     — v1 — body, optional mood score, circadian phase
    circadian_log       — v1 — phase events (app_open, mood_log, etc.)
    urge_log            — v2 — intensity 1-10, trigger/response/passed, rotating question index
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

**Known issue:** golden hour amber feels too aggressive at current intensity. Needs calibration pass — pull back fill and border intensity during goldenHour phase.

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

### NeonCard ✅ glass depth update applied
- Shadow stack — three depth levels: low / mid (default) / high
- Shadow color pulls from card accent — cyan card casts cyan shadow
- Top edge highlight — borderTopColor at 1.8× border intensity, light catching the rim
- Inner glow — LinearGradient from top, 7% accent → transparent by 35% card height
- Noise texture — SVG feTurbulence, seeded per cycleCount
- Ambient shimmer loop
- Scar marks from cycleCount prop
- API unchanged — drop-in, no screen changes needed
- New prop: depth ('low' | 'mid' | 'high') — defaults to 'mid'

### TypewriterText
- Reusable component — app choosing its words
- Character by character, irregular timing
- Punctuation adds pause (. = 140ms extra, , = 80ms)
- Used on: bridge phrase, cover phrase, sponsor first impression
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

## GhostPulse — biofeedback layer ✅ loop closed

The ghost heartbeat. BPM derived from:
- Circadian phase (night slower, day slightly elevated)
- Restlessness score from accelerometer (useOrchidSway)
- Mood score — fully wired

BPM range: 45–78. Drives orb ring pulse speed and breathing exercise timing.
When dormant: fixed slow rate. When active: mirrors and regulates internal state.

**Loop closed:** mood logged → `moodEvents.emit()` in journal.tsx → `useResponsiveHeart` subscribes via `mood-event.ts` → recalculates BPM immediately → orb responds. No delay. 5-minute interval remains as background fallback only.

---

## sponsor tab — connection flow ✅ updated

Role choice comes first — no warmth, just clarity. Two paths:

- **i am in recovery** → typed question appears via TypewriterText: "who do you reach for at 2am?" → name input (component state only, never stored, never transmitted) → name carries into proximity card title as "invite [name]" → invite flow continues
- **i am the sponsor** → straight to code entry. Typed question never appears.

First impression state is component-local. Resets on unmount. Already-connected users skip it entirely.

---

## urge surfing log ✅ shipped

Third entry type in the journal tab, below private journal. Amber accent — distinct from mood (phase-colored) and journal (violet).

**Structure:** five fields presented as a quiet conversation, not a form.
- Intensity — 1–10 pill row, color-coded by heat (cyan=low, amber=mid, red=high)
- What was happening — optional text, rotates through 4 question variants
- What did you do — optional text, rotates through 4 variants
- Did it pass — two-button: "it passed" / "still with me"
- Hold to record — same HoldToConfirm pattern as mood and journal

**Rotating question pools:** four variants per field. `urgeQIndexRef` tracks which variant was last shown and advances by 1 on each save. Same question never repeats twice in a row. Variants stored in `urge_log` table as `trigger_q`, `response_q`, `passed_q` indices.

**Storage:** `urge_log` table in SQLite (Sanctuary vault, v2 migration). Fields: id, ts, intensity, trigger_q, trigger, response_q, response, passed_q, passed, circadian_phase. Burn ritual wipes this table. `Sanctuary.saveUrgeLog()`, `getUrgeLogs()`, `deleteUrgeLog()` in storage.ts.

**History:** shows intensity badge (heat-colored), passed/held status, trigger text, timestamp, delete. Expands after 3 entries.

---

## workbook origin — what the app is completing

The founder built a paper recovery workbook (with journal prompts, CBT exercises, urge surfing log, weekly review, daily schedule) before building the app. The app is the living version of that workbook. Features map directly:

| Workbook section | App feature |
|---|---|
| Daily mood rating (1–10) | Mood logging — journal tab |
| Private journal | Journal entry — journal tab |
| Urge surfing log | Urge surfing — journal tab ✅ |
| Weekly review (7 areas) | Weekly review — growth tab (pending) |
| Daily schedule | Circadian engine — ambient awareness (pending) |
| CBT thought record | Future v3.0 consideration |

The workbook's note on golden hour: *"Late afternoon (4–6 PM) and late night are peak craving and low-mood windows."* This is why golden hour (17:00–20:00) has the Craving Amber accent and protective color psychology. The circadian engine already knows this. The urge surfing log captures what happens in that window.

---

Final step (id: 'enter') now shows "three things, always here" instead of "the cycle begins".
Three ambient rows — breathe / check in / reach sponsor — with CourierPrime glyphs (~ / + / ::).
No interaction on the rows, informational only. The "enter" button still fires completeOnboarding().
Narration: "the garden is always open. / return whenever you need."

---

## known issues / pending fixes

- Golden hour amber too aggressive — calibration pass needed on NeonCard fillIntensity and borderIntensity during goldenHour phase
- NeonCard glass effect may need higher shadowOpacity on dark backgrounds — mid depth at 0.15 is subtle
- "1 days" plural — fix applied, verify on device
- BreathingExercise hasStarted ref — may need useState for beginHint visibility
- OuroborosRing gap — 14%, verify reads as open on device
- ..: :.. glyph vertical centering — includeFontPadding fix applied
- SVG filter warnings (FeTurbulence etc) — expected in Expo Go, not errors
- NitroModules warning — expected in Expo Go, EAS only

---

## build order (immediate)

1. ~~Bridge screen~~ ✅ done
2. ~~Onboarding exit screen~~ ✅ done — "three things, always here"
3. ~~Sponsor tab first impression~~ ✅ done — role first, typed question for recovery user only, name carries forward
4. ~~GhostPulse ← mood score~~ ✅ done — loop closed via mood-event.ts
5. ~~NeonCard glass depth~~ ✅ done — shadow stack, top edge highlight, inner glow
6. ~~Mercury tab bar~~ ✅ done — thread + droplets, active lifted by surface tension, long press → Phosphor Noir easter egg
7. ~~Urge surfing log~~ ✅ done — journal tab, rotating question pools, amber accent, Sanctuary v2
8. Weekly review — growth tab, surfaces Sunday evening in void phase, 7 areas, biggest win, one adjustment
9. Railway fresh deploy
10. EAS build Android first
11. EAS build iOS
12. Store listings

---

## 3D depth layer (in progress)

### NeonCard ✅ done
Shadow stack, top edge highlight, inner glow gradient.

### Mercury tab bar — next
One continuous thread that splits into four droplets. Active tab is the droplet pulled upward by surface tension. Nearly invisible when idle, brightens on interaction.

### Remaining depth work
- **Parallax** — orb 30% slower than scroll, background 10% slower than orb
- **Light sourcing** — one source per phase. Dawn = top left. Void = from below. Desire = warm side amber.
- **Press depth** — quick-slots push away on tap (scale down + dim), spring back on release
- **OuroborosRing perspective tilt** — subtle rotateY, reads as halo in space not flat circle
- **Z-depth opacity** — ambient 40%, orb 75%, quick-slots 90%, text 100%
- **Reactive depth** — every interactive element comes toward you on tap
- **Drag resistance** — interface becomes more viscous when restlessness score is high. Wire into orb interaction and breathing exercise first, navigation later.

---

## v2.5 — Ouroboros Navigator (deferred, design locked)

Replaces tab navigation with a sphere-based inhabitable space. Design decisions locked:

- User stays centered — interface moves around them, not the other way
- Orb is stationary anchor — screens orbit it, it never travels
- 2am mode becomes viscous — heavier, slower, dreamlike — not stark
- Paths reveal on pause — quadrants breathe into visibility when user is still, recede when moving
- Depth axis is a sphere — no hierarchy, every direction equidistant from center
- Drag resistance tied to restlessness score (useOrchidSway)

Do not build until mercury tab bar and Railway deploy are complete.

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
- Never use plain English abbreviations in comments or docs — write it out in full
- Never transmit user health data to any server
- Blind relay only — server sees ciphertext, nothing else
- PAYWALL_ACTIVE=false — do not enable
- butterfly-dna.gif and butterfly-dna-t.gif — do NOT touch
- expo-av and expo-audio broken in Expo Go SDK 54 — audio deferred to EAS
- react-native-quick-crypto NitroModules warning in Expo Go — expected, not a crash
- Start dev server with: pnpm expo start --tunnel --clear
- Never use npx expo or npm directly — always pnpm

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
