# CONTEXT.md — Kataleya
# Architecture and conventions for collaborators.
# No credentials. Safe to share.

---

## what this is

Kataleya is a privacy-first recovery companion. Not a tracking app. Not a clinical tool. A sanctuary.

The one moment it exists for: someone at 2am reaches for the app instead of the other thing.

**The app should know as little about you as possible.** Health data never leaves the device. This is not a policy — it is an architecture constraint.

---

## tech stack

- Expo SDK 54, React Native, TypeScript
- expo-router (file-based routing)
- expo-sqlite (JSI — EAS builds only, dormant in Expo Go)
- expo-secure-store
- AsyncStorage
- react-native-quick-crypto (NitroModules — EAS only, expected warning in Expo Go)
- expo-linear-gradient
- pnpm (always — never npm or npx)

**Known Expo Go limitations:**
- expo-sqlite is dormant — no database reads or writes
- react-native-quick-crypto will warn — not a crash, expected
- expo-av / expo-audio broken in SDK 54 Expo Go — audio deferred to EAS builds
- SVG filter warnings (feTurbulence etc) — expected, not errors

**Start dev server:**
```bash
pnpm expo start --tunnel --clear
```

---

## three-vault architecture

All sensitive data stays on device. Three storage layers:

| Vault | Storage | Contents |
|---|---|---|
| Surface | AsyncStorage | preferences, sobriety date, onboarding state, weekly review |
| Sanctuary | SQLite | mood logs, journal entries, circadian events, urge logs |
| Fortress | OS Keychain | sponsor credentials, encryption keys |

Storage API lives in `utils/storage.ts`. Never read/write vaults directly — always go through that API.

---

## file structure

```
app/
  _layout.tsx         — root layout: fonts, navigation stack, app-wide providers
  bridge.tsx          — arrival screen, shown every session
  cover.tsx           — 2am / panic screen
  onboarding.tsx      — 7-step onboarding
  burn.tsx            — burn ritual wrapper
  breathe.tsx         — breathing exercise route
  ground.tsx          — grounding exercise route
  (tabs)/
    _layout.tsx       — tab layout, mercury bar, phosphor noir easter egg
    index.tsx         — home screen (the garden)
    journal.tsx       — mood logging, journal entries, urge surfing
    growth.tsx        — weekly review
    vault.tsx         — privacy, export, burn ritual
    sponsor.tsx       — sponsor connection

components/
  GhostPulseOrb.tsx   — central orb, BPM-driven breathing, ..: :.. glyph
  OuroborosRing.tsx   — never-closing ring, scar marks, segment ticks
  NeonCard.tsx        — glassmorphism card — shadow stack, top edge highlight, inner glow
  MercuryTabBar.tsx   — mercury thread tab bar, long press → Phosphor Noir
  BreathingExercise.tsx — 4-7-8 breathing, tap to begin
  GroundingExercise.tsx — 5-4-3-2-1 grounding
  BurningRitual.tsx   — hold to ignite, irreversible
  HoldToConfirm.tsx   — reusable hold gesture
  typewriter-text.tsx — character-by-character text, punctuation pauses
  GlyphIcon.tsx       — SVG icon system
  CRTScreen.tsx       — Phosphor Noir CRT wrapper (easter egg)
  TerminalNav.tsx     — Phosphor Noir command terminal (easter egg)

hooks/
  useCircadian.ts     — phase (dawn/day/goldenHour/night), theme, darkOverride
  useSobriety.ts      — daysSober, milestones, progress
  useOrchidSway.ts    — accelerometer restlessness score (0–1)
  useResponsiveHeart.ts — BPM engine, subscribes to mood events
  use-user-state.ts   — adaptive engine: struggling/stable/thriving/rest
  useAnimatedTheme.ts — animated theme transitions between phases
  useDepthPress.ts    — press depth animation for interactive elements

constants/
  theme.ts            — themeForPhase(), ThemeTokens type, base colors
  palettes.ts         — color palette definitions, DEFAULT_PALETTE_ID
  circadian.ts        — phase config, timing functions
  phosphor-noir.ts    — Phosphor Noir CRT constants (easter egg)

utils/
  storage.ts          — Surface / Sanctuary / Fortress APIs
  backup.ts           — AES-256 encrypt/decrypt (EAS only)
  crypto.ts           — encryption primitives (EAS only)
  db.ts               — SQLite init, migrations, user_version PRAGMA
  mood-event.ts       — pub/sub for mood-logged signal (no dependencies)
  hapticBloom.ts      — haptic feedback patterns
```

---

## color system — Ouroboros Protocol

Base is always Null Black (`#050508`). Accent shifts per circadian phase.

**Active palette: turquoise**

| Phase | Time | Accent | Hex |
|---|---|---|---|
| dawn | 05:00–08:00 | blue-green cyan | `#00c8c8` |
| day | 08:00–17:00 | sky cyan | `#00d4ff` |
| goldenHour | 17:00–20:00 | craving amber | `#ff6b35` |
| night | 20:00–05:00 | deep navy | `#1e6091` |

Other fixed colors:
- Null Black `#050508` — base, all phases
- Scar Silver `#8a8a9e` — muted text, scar marks
- Danger red `#ff3366` — burn, delete

**Do not hardcode accent colors in components.** Always pull from `themeForPhase()` or `useCircadian().theme`.

---

## circadian engine

Four phases map to internal names and user-facing display:

| Internal | User sees | Phase |
|---|---|---|
| renewal | morning | dawn |
| choice | afternoon | day |
| desire | evening | goldenHour |
| void | night | night |

`useCircadian()` returns `{ phase, theme, darkOverride }`.
Override pill: tap → forces night/void. Long press mercury bar → Phosphor Noir easter egg.

---

## adaptive engine

`use-user-state` returns one of four states based on mood history and phase:

- **rest** — void phase after 22:00 — minimal UI, slowest orb
- **struggling** — avg mood ≤ 4.0, or trending down
- **thriving** — avg mood ≥ 7.0, ≥3 days sober, not trending down
- **stable** — everything else

State drives orb pulse speed, opacity, background intensity, greeting pool.

---

## GhostPulse — biofeedback

BPM range: 45–78. Derived from:
- Circadian phase
- Restlessness score from accelerometer (`useOrchidSway`)
- Mood score (wired via `mood-event.ts` pub/sub)

Loop: mood logged → `moodEvents.emit()` → `useResponsiveHeart` recalculates → orb responds immediately.

---

## database schema — SCHEMA_VERSION 2

Migrations via `user_version` PRAGMA in `utils/db.ts`.

```
mood_logs        — id, ts, score, restlessness, circadian_phase
journal_entries  — id, ts, body, mood_score, circadian_phase
circadian_log    — id, ts, event, phase
urge_log         — id, ts, intensity, trigger_q, trigger, response_q, response,
                   passed_q, passed, circadian_phase
```

Burn ritual wipes all four tables. Never add columns without adding a migration.

---

## key component rules

**OuroborosRing**
- Never closes — always a 14% gap
- Gap edge markers flank the break
- Scar marks every 3 days sober, max 12 visible
- `showDots` prop: false on cover screen, true on home

**GhostPulseOrb**
- `..: :..` glyph at core — do not replace with butterfly
- Size: 82px (day 0) → 130px (year 1)
- Always breathing — restlessness accelerates, never removes pulse

**NeonCard**
- `depth` prop: 'low' | 'mid' | 'high' — defaults to 'mid'
- Shadow color pulls from card accent
- Drop-in — no screen changes needed when upgrading

**BurningRitual**
- One step only — hold to ignite, done
- No reason selection, no confirmation gate
- Post-burn: "the garden has burned" → "begin again"

**TypewriterText**
- Props: `text`, `speed` (45ms default), `jitter` (28ms default), `startDelay`, `onComplete`, `style`
- Punctuation pauses: `.` = 140ms extra, `,` = 80ms extra

---

## design principles

**The one question everything answers to:**
> "Does this feel like it's alive, or does it feel like it was placed here?"

**Breathing UI rules:**
- Nothing fully static when idle — something always moves
- No hard edges — borders suggest, not frame
- Color is atmospheric temperature, not information
- Transitions organic — things emerge and recede
- Cards are fields, not boxes

**The 2am principle:**
> Someone at 2am reaches for the app instead of the other thing.
> No menu. No options. Just the orb breathing and one quiet line
> that already knows what time it is.

**Language:**
- Code uses internal phase names (void, desire, renewal, choice)
- User sees garden language (night, evening, morning, afternoon)
- No generic emoji — CourierPrime glyphs only (`~`, `+`, `::`, etc.)
- Never abbreviate in comments or docs — write it out in full

---

## working rules

- One file at a time — test → commit → next
- `kebab-case` file names always, no exceptions
- `snake_case` only when the platform forces it (SQLite column names)
- Never transmit user health data to any server
- Blind relay only — server sees ciphertext, nothing else
- `PAYWALL_ACTIVE=false` — do not enable, do not touch
- `butterfly-dna.gif` and `butterfly-dna-t.gif` — do not touch, do not remove
- Always `pnpm` — never `npm` or `npx expo`

---

## what is done

- Bridge screen (arrival ritual)
- Onboarding (7 steps, exit: "three things, always here") — redesign in progress
- Home screen with GhostPulseOrb + OuroborosRing
- Mood logging, journal entries, urge surfing log
- Weekly review (growth tab, wired to Surface storage)
- Sponsor tab (role-first flow, end-to-end encrypted via NaCl)
- BurningRitual (irreversible, one step)
- BreathingExercise (4-7-8), GroundingExercise (5-4-3-2-1)
- NeonCard glassmorphism system
- Mercury tab bar (renders + navigates — migrating to CaduceusTabBar)
- Phosphor Noir easter egg (long press mercury bar — intentional, keep it)
- Circadian engine + adaptive state engine
- GhostPulse biofeedback loop (mood → BPM → orb)
- Turquoise as active palette default (night = deep navy #1e6091, not violet)

## active bugs (confirmed on device Apr 16 2026)

- BreathingExercise frozen at "inhale 4" — native/JS driver conflict in coreGlow animation
- greetPhrase shows "good afternoon" at 08:35am — day phase maps wrong before noon
- HoldToConfirm unreliable inside ScrollView — scroll gesture steals touch
- Override pill works once then stops — animation loop conflict on re-render
- ECG/wave animations race-pulse then stop — too many simultaneous loops
- Export crashes in Expo Go — react-native-quick-crypto is EAS only (expected, not a bug)

## what is pending

- Bug surgery (in progress) — see active bugs above
- CaduceusTabBar — replace MercuryTabBar with double-helix caduceus, phase-aware viscosity
- Attunement onboarding — replace 7-step sequence with presence-first ritual (Kimi designing)
- Cover screen redesign — needs 2am presence (Kimi designing)
- Railway blind relay server — fresh deploy needed
- EAS build (Android first, then iOS)
- Store listings
- Parallax, light sourcing, press depth, OuroborosRing perspective tilt (3D depth layer)
- Ouroboros Navigator (v2.5 — sphere-based navigation, design locked, not started)

## export / EAS-only features

These work in EAS builds only. Do not treat as bugs in Expo Go:
- Encrypted backup / export (react-native-quick-crypto)
- SQLite mood/journal storage (expo-sqlite JSI)
- Audio narration (expo-av broken in Expo Go SDK 54)
- Sponsor encryption (react-native-quick-crypto)
