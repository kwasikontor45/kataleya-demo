# Kataleya — Claude Code project memory

## What this app is
Kataleya is a privacy-first mobile recovery support app built on Expo SDK 54 (React Native).
It is not a crisis app. It is a living, breathing extension of the user — body, mind, and soul in sync.
The core experience is **adaptive UI**: the app reads the user's state and responds visually and tonally without asking. No pop-ups. No notifications. Just the app feeling it with you.

## Accounts & identifiers
- GitHub: github.com/kwasikontor45/kataleya
- Expo account: bleedin6ed6e
- EAS project ID: 72297d8e-1e5e-45f4-9e04-da70ac5d7207
- Project root: ~/kataleya/artifacts/kataleya-app

## Tech stack
- Expo SDK 54, React Native
- TypeScript throughout
- expo-router (file-based routing, tabs)
- expo-sqlite (JSI — requires EAS build, stripped by Expo Go)
- expo-secure-store
- AsyncStorage
- Railway (API server, Node.js)
- channels.json persists via Railway Volume at /data

## Three-vault storage architecture
| Vault | Storage | Purpose |
|---|---|---|
| Surface | AsyncStorage | Non-sensitive, fast access |
| Sanctuary | SQLite (expo-sqlite) | Structured local data |
| Fortress | SecureStore / Keychain | Encrypted sensitive data |

## Tab structure (app/(tabs)/)
- index.tsx — home screen, GhostPulseOrb, breathing, mood, urge surf
- growth.tsx — journal, mood compass, streak, growth log
- vault.tsx — three-vault interface
- (two more tabs TBD)

## Key components
- GhostPulseOrb — replaces OrchidSVG, ambient animated orb on home screen
- NeonCard — foundation card system
- RainCanvas — ambient rain particle system
- UrgeSurf — fullscreen modal, ride-the-wave countdown
- ButterflyCard — inspiration card with rain animation
- BreathingExercise — ocean background, auto-starts on mount
- CircadianPill — time-aware pill indicator

## Adaptive UI system (in progress — core vision)
The app reads three signal types and outputs a user state that drives UI behavior:

### Signals
- Body: circadian time, urge log, sleep
- Mind: mood score, journal entries, streak
- Soul: last breathing session, time of day, ritual completion

### User states → UI response
| State | Trigger logic | UI behavior |
|---|---|---|
| Struggling | mood ≤ 4, urge active, or late + no breath session | orb pulses slow, rain dims, soft prompt appears |
| Stable | default / no strong signals | normal rhythm, all features visible |
| Thriving | mood ≥ 7, streak active, breath done today | butterfly animations, brighter, expansive |
| Night / rest | after 10pm or circadian night phase | deep dim, breath only, minimal UI |

State engine lives in: `hooks/use-user-state.ts` (to be built)
It reads from vault/storage and outputs one of the four states.
The home screen and orb consume this state directly.

## Visual identity
- App icon: monarch butterfly with DNA double helix on wings and horns
  — transformation + biology + edge. Dark background, amber/burnt-orange wings.
- Color language: deep blacks, amber, orchid/violet, rain-blue, soft white
- No clinical UI. No hard edges. Everything breathes.
- Rain is ambient, never intrusive
- Butterfly = transformation metaphor throughout

## Naming conventions (strict)
- kebab-case for everything: file names, component files, CSS classes, hook files
  e.g. use-user-state.ts, ghost-pulse-orb.tsx, neon-card.tsx
- snake_case only when the project/situation requires it
- No PascalCase files, no camelCase files, no other conventions

## Subscription / paywall
- Infrastructure complete, gated behind PAYWALL_ACTIVE=false
- Deferred to v3.0

## Features requiring EAS build (not Expo Go)
- expo-sqlite (JSI module)
- AES-256 backup
- Android push notifications

## Current version
v2.4 — merge complete, API setup done, adaptive UI in progress

## How we work
- Brief explanation first, then command block
- Command block format (always end fixes with this):
```
cp ~/file.tsx ~/kataleya/artifacts/kataleya-app/path/to/file.tsx
git add -A && git commit -m "fix: description" && git push origin main
```
- kebab-case. always. no exceptions unless forced.
