# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `artifacts/kataleya-app` (`@workspace/kataleya-app`) — primary artifact

Privacy-first, circadian-aware sobriety companion — Expo mobile app (React Native).

- **Font**: Courier Prime (400/700/italic) — loaded in `_layout.tsx`
- **Color system**: `MorningBloom` (warm light) ↔ `MidnightGarden` (#0e0c14 dark plum), interpolated by `interpolateTheme()` in `constants/theme.ts` based on circadian blend value
- **Circadian engine**: `hooks/useCircadian.ts` — computes phase (dawn/day/goldenHour/night) and blend ratio, updates every minute (15s during golden hour transition)
- **Sobriety tracker**: `hooks/useSobriety.ts` — live second counter, milestones, progress-to-next, persisted via AsyncStorage
- **Responsive Heart**: `hooks/useResponsiveHeart.ts` — reads mood history from AsyncStorage, computes BPM (45-80), inhale/hold/exhale ratios, amplitude; drives `..: :..` animation
- **Storage tiers**: `utils/storage.ts` — `Surface` (UI prefs) + `Sanctuary` (sobriety data + mood logs) via `@react-native-async-storage/async-storage`
- **Burn Ritual**: `components/BurningRitual.tsx` — reason selection (4 options), 3s hold-to-ignite, cryptographic wipe via `Sanctuary.deleteAll()`
- **Screens**: Onboarding (7-step: welcome/name/substance/sobriety_date/privacy/notifications/ready), Sanctuary (counter + orchid + breathing), Growth (milestones + insights/patterns), Journal (mood + notes), Sponsor (channel management), Vault (privacy + circadian info + burn access)
- **Navigation**: File-based Expo Router, 5-tab bar (sanctuary/growth/journal/vault/sponsor)
- **Insights**: `hooks/useInsights.ts` — `phaseLowestMood`, `moodTrend`, `checkInFrequency` patterns; exports `hasEnoughData` (≥7 logs in 90d) + `dataAgeDays` for UI disclosure; shown on Growth tab
- **Orchid sway**: `hooks/useOrchidSway.ts` — accelerometer-driven 100-sample RMS restlessnessScore (0-1), wired into journal mood saves
- **Sponsor channel**: `hooks/useSponsorChannel.ts` — offline check-in queue via `Surface.PENDING_CHECKIN`; replays on app foreground; `hasPendingCheckin` flag returned; E2E encrypted messages via X25519 key exchange (TweetNaCl); keys stored in Fortress (SecureStore); server stores only ciphertext
- **E2E crypto**: `utils/crypto.ts` — `generateKeyPair()`, `encryptMessage()`, `decryptMessage()` using TweetNaCl (pure JS, Expo Go compatible); Fortress keys `CRYPTO_PK`, `CRYPTO_SK`, `PEER_PK`
- **Notifications**: `hooks/useNotifications.ts` — daily reminder scheduler + milestone bloom notifications; `expo-notifications` plugin in app.json; permission request in onboarding step 5
- **Burn Ritual**: UX safety gate — hold → confirm screen with tombstone write → `burnAll()`; `Surface.BURN_LOG` key
- **Storage keys**: Surface `kataleya.surface.*` including `pending_checkin`, `notif_enabled`, `notif_reminder_time`, `last_notified_milestone`, `burn_log`
- **Subscription tiers**: `utils/entitlements.ts` — Seed/Bloom/Garden tier definitions, feature gates, `canAccess()`. `hooks/useEntitlements.ts` — returns current tier + `check(feature)` + paywall state. `PAYWALL_ACTIVE = false` currently (everyone gets Bloom); flip to `true` once RevenueCat is wired.
- **Paywall UI**: `components/PaywallModal.tsx` — bottom-sheet modal showing Bloom/Garden tiers with feature lists; `onSubscribe` callback ready for RevenueCat
- **Privacy screen**: `app/privacy.tsx` — full privacy policy in founder voice; linked from Sanctuary and Growth tabs; accessible at `/privacy` route
- **Error boundary**: `components/ErrorFallback.tsx` — brand-matched calm recovery UI (`#0e0c14` bg, Courier Prime, ⟡ glyph, "the sanctuary lost its footing."); reloadAppAsync on main CTA; DEV-only collapsible stack trace
- **EAS build**: `eas.json` — development (simulator), preview (internal distribution), production (autoIncrement) profiles; bundle ID `com.kataleya.app`
- **app.json fix**: Syntax error (missing comma after `"supportsTablet": false`) corrected
- **Onboarding UX**: Progress dots (5 filled dots replacing text counter "01 / 05"); stepContainer gap 24px; dots animate from empty to filled as steps advance
- **Sanctuary home**: Personalized greeting from `Surface.getName()` ("good evening, alex"); improved empty state ("the garden waits for you"); privacy link in footer
- **Message thread**: Sponsor tab messages now in `ScrollView` with `maxHeight: 300`; `onContentSizeChange` auto-scrolls to newest; `threadScrollRef.scrollToEnd` on new message + chat open
- **Empty states**: Journal (mood log empty + entries empty with atmospheric copy); Growth (⟡ glyph + "the season hasn't begun yet" copy); insightEmpty improved copy

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
