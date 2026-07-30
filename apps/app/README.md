# Momentry Expo App

Momentry is a private, local-first journal for diary entries, movie memories, and book notes.

The product source of truth is [`../../docs/product-intent.md`](../../docs/product-intent.md). Use it when deciding product scope, copy, data behavior, and whether a proposed feature belongs in Momentry.

## Runtime

- Active app: `apps/app`
- Expo SDK: 57 / React Native 0.86
- App ID: `kr.co.uulab.momentry` (iOS and Android)
- Scheme: `momentry`
- Runtime version: `1.0.0`
- EAS owner/project: `uulab/momentry`

The route files in `app/` stay thin. Product code lives in `src/features`, shared UI in `src/components`, SQLite access in `src/db`, and theme/data state in `src/providers`.

## Product map

- `일기`: local diary timeline, photo entry, date selection, search, editing, and sorting
- `영화`: TMDB discovery when configured, direct entry, rating, notes, search, and editing
- `책`: Open Library discovery, direct entry, rating, notes, search, and editing
- `전체`: unified memory search across diary/movie/book, theme, notices, FAQ, policy summaries, local reminder settings, support contact, and app/runtime information

All entries are stored in the app's SQLite database. Settings can export a versioned JSON backup containing entries and their persisted image data, then replace the local database from a validated backup on another device. Newly selected photos and available search-result covers are copied into the app's persistent file area instead of relying on a temporary picker path; export converts them back to portable data URIs and import stores them persistently again. Deleted entries remain in the local Recently Deleted area for 30 days and can be restored from Settings. If a remote cover cannot be downloaded, the original URL is retained so saving the memory is not blocked. The retired Flutter package used a different application sandbox and had no confirmed public store listing, so no automatic legacy import is provided. Cloud sync and encrypted backup remain out of scope.

For the rationale behind this information architecture, local-first storage, deliberate non-goals, and feature priority, read [`../../docs/product-intent.md`](../../docs/product-intent.md).

## Development

```bash
npm install
npm run ios
npm run android
npm run verify
npm run ota:check
```

Movie discovery is optional:

```bash
cp .env.example .env.local
# Set EXPO_PUBLIC_TMDB_API_KEY in the ignored local file.
```

Never copy the legacy Flutter Naver/TMDB credentials into source. Rotate any credential that was committed in the old app.

## Updates and builds

The native splash is a short static mark. `src/components/StartupGate.tsx` owns OTA checking, fixed progress, and handoff to the app shell. Expo `checkAutomatically` must remain `NEVER`.

```bash
npm run update:msg -- "Describe the user-visible change"
npm run build:local:ios
npm run build:local:android
npm run build:testflight:ios
npm run build:play:android
```

The update scripts run `preflight:update` and the native-change guard before publishing, and production updates use the `production` EAS environment. Native dependencies, permissions, identifiers, icons, splash config, SDK changes, and lockfile changes require a new binary. JS/UI-only compatible changes may use OTA after the guard passes. Bottom-tab presses provide selection haptics; pressing the selected tab again scrolls its primary list to the top without remounting or clearing state.

Before publishing, follow [`../../docs/ota-checklist.md`](../../docs/ota-checklist.md). Use `npm run install:ota-baseline` to reproduce the verified store dependency set without rewriting its lockfile, then run `npm run ota:check` for TypeScript, lint, OTA-safe Expo Doctor checks, public-config validation, and the native-baseline guard. For an OTA targeting the installed store runtime, keep the verified package/lockfile baseline unchanged; evaluate Expo patch recommendations separately as a binary release.

The generated release harness provides local EAS builds, Fastlane/Match, store metadata, and submission commands. The Apple Developer App ID, Match App Store profile, store listings, screenshots, and review submission are configured. The current native binary includes Expo Notifications with the Momentry channel, Android notification icon, iOS notification capability, permission UX, and a local test notification. Runtime delivery is local-only; remote delivery remains blocked until the Momentry-specific Firebase Android transport, APNs/EAS credential, token backend, and event policy are connected.

`npm run push:check` validates the currently shipped local-notification contract. Once remote Expo Push is intentionally enabled, run `npm run push:check:remote`; that stricter gate requires the Momentry-specific Android transport file, Expo project-scoped token registration, and the server-side delivery contract before a remote-push binary is released.
