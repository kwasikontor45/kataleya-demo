<div align="center">

<br />

```
..: kataleya :..
```

<br />

**privacy-first, containment as architecture meets genuine empathy.**

*a recovery companion designed to treat users with dignity.*

<br />

[![Privacy](https://img.shields.io/badge/privacy-zero--knowledge-4a9e7f?style=flat-square&labelColor=0d0d0d)](/)
[![Architecture](https://img.shields.io/badge/architecture-local--first-5b7fa6?style=flat-square&labelColor=0d0d0d)](/)
[![Storage](https://img.shields.io/badge/storage-three--vault-7a5c99?style=flat-square&labelColor=0d0d0d)](/)
[![Status](https://img.shields.io/badge/status-pre--launch-c47b3a?style=flat-square&labelColor=0d0d0d)](/)

<br />

</div>

---

Kataleya moves away from the clinical coldness of medical trackers and the patronizing nature of gamified recovery apps. It offers a quiet, intentional space for healing — one where every technical decision traces back to a single conviction:

> *the app should know as little about you as possible.*

---

## contents

- [key features](#-key-features)
- [privacy architecture](#-privacy-architecture)
- [the circadian engine](#-the-circadian-engine)
- [technical stack](#-technical-stack)
- [installation](#-installation)
- [philosophy](#-philosophy)

---

## ✦ key features

**ghost pulse orb**
a non-intrusive visual grounding element. presence without monitoring. it breathes with the user — never watching, always there.

**garden language**
a progression system built on organic metaphor rather than rigid clinical metrics. growth is measured in seasons, not streaks.

**golden hour transitions**
the ui shifts with the natural arc of the day. visual warmth increases at dusk, reducing cognitive load during high-stress windows.

**the burn ritual**
a three-phase cryptographic destruction sequence. thoughts, logs, and credentials are released — permanently and irreversibly. there is no recovery by design.

**circadian badge**
a living phase indicator — dawn, day, golden hour, night — that communicates the engine's current context at a glance.

---

## 🛡 privacy architecture

kataleya is built on a zero-knowledge foundation. privacy is not a feature — it is the architecture.

### the three-vault system

| vault | purpose | security |
|---|---|---|
| **surface** | preferences and local configuration | asyncstorage |
| **sanctuary** | encrypted logs of the journey | sqlite · local only |
| **fortress** | credentials and cryptographic keys | os keychain · biometric-locked |

### blind relay messaging

communication between users and sponsors uses a blind relay protocol. the server never holds message content — only encrypted ciphertext passes through. keys are generated on-device and never transmitted. the relay is structurally incapable of reading what it carries.

### the burn ritual

executing the burn ritual wipes all three vaults in sequence. if interrupted mid-process, the next launch completes the destruction automatically. after a clean burn, kataleya has no memory of the user.

---

## 🌙 the circadian engine

the most deliberate piece of kataleya. a person in recovery at 2:00 am is not the same person they are at dawn — and the app knows this.

the circadian engine is a locally-processed behavioral model segmented across four phases:

```
dawn  ·  day  ·  golden hour  ·  night
```

across each phase, the engine:

- **adapts ui density** — reduces visual noise and shifts color temperature during late-night hours
- **shifts tone** — garden language becomes more grounding during high-vulnerability windows
- **reads restlessness** — accelerometer rms is sampled and compared against phase-specific personal baselines
- **surfaces predictive nudges** — if a phase has trended harder lately, a contextual suggestion appears quietly
- **never reports** — no behavioral data leaves the device. the engine learns the user's rhythm without transmitting it

---

## 🛠 technical stack

| layer | technology |
|---|---|
| **framework** | expo sdk 54 · react native |
| **local database** | expo-sqlite · sanctuary vault |
| **secure storage** | expo-secure-store · fortress vault |
| **encryption** | x25519 + xsalsa20-poly1305 via tweetnacl |
| **server** | node.js · railway · blind relay only |
| **build system** | eas (expo application services) |
| **animations** | react native reanimated · ghost pulse orb |

---

## 🌱 installation

```bash
# clone the repository
git clone https://github.com/[your-username]/kataleya.git
cd kataleya

# install dependencies
npm install

# start in expo go (limited — jsi modules inactive)
npx expo start

# production build via eas
eas build --platform android
eas build --platform ios
```

> **note:** features requiring jsi modules — including aes-256 backup and android push notifications — are inactive in expo go. this is expected behavior, not a bug. use an eas build for full functionality.

---

## 🤝 philosophy

> *kataleya is what you get when privacy-first architecture meets genuine empathy for the person holding the phone.*

we welcome contributors who understand that software is a form of care. if you are interested in refining the garden language, hardening the blind relay protocol, or extending the circadian engine — see [`CONTRIBUTING.md`](./CONTRIBUTING.md).

all contributions must preserve the zero-knowledge guarantee. features that require transmitting behavioral data will not be merged.

---

<div align="center">

<br />

```
..: built with intention :..
```

<br />

*no analytics · no crash reporter · no advertising network*
*no firebase · no amplitude · no sentry · no mixpanel*

<br />

</div>
