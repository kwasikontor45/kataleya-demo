# Kataleya v2.1 — Executive Board Briefing
### Audience: Board of Directors
### Date: March 2026 | Classification: Confidential

---

## The One-Line Summary

Kataleya is a sobriety companion app where **health-sensitive data physically cannot leave the user's device** — and we have the architecture to prove it.

---

## Why This Exists

Addiction recovery is one of the most sensitive health contexts a mobile app can enter. Every other wellness or recovery app in this space — Sober Grid, Monument, Recovery.org — monetizes through one of three mechanisms: advertising against behavioral data, insurance partnership data sharing, or pharmaceutical company referrals.

We chose a different model because we believe it is the only model a sophisticated user in recovery will trust long-term.

**Our revenue model:**

| Tier | Price | What they pay for |
|------|-------|-------------------|
| Seed | Free | Core circadian tracking, mood logging, 30-day insights |
| Bloom | $4.99/month | Unlimited history, advanced pattern charts, encrypted backup |
| Garden | $39.99/year | Everything + priority support, beta access |

**What we never sell:** User data. Behavioral patterns. Anonymous aggregates. Referral fees from treatment providers.

Revenue equals value delivered. Period.

---

## The Privacy Promise — Precisely Stated

The central claim we make to users is: *"Your mood logs, journal entries, and all health-sensitive data physically cannot leave this device."*

This is not a privacy policy. It is an architecture constraint. Here is what it means in practice:

**Health-sensitive data lives in exactly two places:**

1. The user's device — stored locally in a SQLite database that never connects to any network
2. Nowhere else

There is no Kataleya server that stores mood logs. There is no analytics pipeline that processes journal entries. There is no database we could be subpoenaed for, breached from, or compelled to hand over — because it does not exist.

### The Sponsor Channel: Honest Disclosure

The app includes an optional feature: a presence channel between the user and one trusted sponsor. This channel relays presence signals ("water" or "light") in real time via a relay server. The server holds in memory:

- Whether the user checked in today (a date string, not health data)
- The orchid milestone stage (a label like "seedling", not a mood score)
- The milestone count (an integer, not journal content)

These are present by design — the sponsor channel exists specifically to share "I showed up today" with a trusted person. No mood score, no journal content, and no sobriety start date is ever sent to the server. The channel state is held in RAM only, expires automatically, and cannot be queried by us outside of the running server process.

The privacy promise for health data holds precisely and completely.

### Why This Matters for the Board

| Risk | Industry Approach | Kataleya Approach |
|------|------------------|-------------------|
| Data breach | "We encrypt at rest" | Health data never reaches us to breach |
| Regulatory (HIPAA, GDPR) | Compliance program | Architectural exemption — we don't hold covered health data |
| Subpoena / law enforcement | Legal review, potential disclosure | Health data disclosure impossible — we don't have it |
| Trust erosion | PR response | Trust is structural, not earned through communication |

---

## Zero-Knowledge Encrypted Backup

As of v2.1, users can export a fully encrypted backup of their data to any storage provider — iCloud Drive, Google Drive, a USB drive, their email. The encryption happens entirely on-device using a user-chosen passphrase that is never stored or transmitted.

**The design property:** If we were served a court order for all backup files, compliance would produce opaque encrypted bytes. Without the user's passphrase — which we do not have — those bytes reveal nothing.

**Why this matters for revenue:** Encrypted backup is a Bloom-tier feature ($4.99/month). It is also the feature that makes power users comfortable storing years of recovery data in the app. Long-term data retention equals long-term subscribers.

---

## What Has Been Built

As of March 2026, the following is live and functional:

**Core Experience**
- Circadian color engine: four phases (dawn, day, golden hour, night), adaptive polling
- Sobriety timer: second-precise, 10 milestone stages from Day 1 to Year 5
- Orchid growth visualization: Phalaenopsis SVG blooming incrementally with recovery progress
- Bridge ritual: every app open is a 5-second regulated moment

**Journal Tab**
- Mood logging: five states, circadian phase auto-captured, user correction field
- Private journal: 4,000-character entries, delete-on-demand, keyboard dismiss
- Dedicated screen separate from security settings — daily use without navigating through vault controls

**The Vault Tab**
- Three-tier storage: SQLite for health data, OS Keychain for credentials, AsyncStorage for preferences
- Zero-knowledge encrypted backup: AES-256, PBKDF2-SHA256, on-device passphrase, zero server involvement
- Pre-export cloud warning: shown unconditionally before backup passphrase entry, cannot be dismissed

**Sponsor Presence Channel**
- Real-time presence signaling: "water" (calm) and "light" (strength)
- Invite code, 48-hour expiry if unclaimed, 90 days active
- No message content stored, no message history

**Safety Features**
- Cover/panic screen: one tap to blank the screen
- Burn Ritual: 3-second hold gesture wipes all three vaults simultaneously

**Pattern Insights Engine**
- Fully local, confidence-gated (≥ 72%), observational language only
- Three pattern types: phase mood correlation, 14-day trend, check-in habit

---

## Competitive Positioning

The wellness app market is $5.6B (2024) and growing. Existing recovery apps have a structural problem: their business model requires user data, so their privacy claims are always qualified.

We have built the opposite. Our business model requires only that the product works well. The encrypted backup feature — data the user fully owns, encrypted with a key we never see — is the clearest possible demonstration that this is not a posture.

---

## What Comes Next

**v2.1 (Q2 2026):** SQLite schema versioning, export-to-PDF for Bloom users, onboarding completion
**v3.0 (Q3 2026):** Pattern insights UI, sponsor message channel with E2E encryption, push notifications, automated iCloud Drive backup API integration
**v4.0 (2027):** Federated peer insights (local model, anonymized), subscription revenue analytics (product-level only)

---

*Prepared by the founding engineering team. March 2026.*
