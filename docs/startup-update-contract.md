# Momentry startup contract

This is a JavaScript/source-only startup change. App configuration, installed native update policy, runtime version, dependencies, local entries, theme provider, notification routing and the nine existing Pretendard assets remain outside its scope.

## Timing and resources

- One runtime owner shares the actual pending nine-font load across retries and React remounts
- The initial whole preparation budget is 12 seconds, beginning before font preparation
- Essential fonts get a 5-second resource window. Failure or expiry shows a readable system-font recovery message and the existing logo. Ordinary app labels never mount without successful font preparation
- Recovery retries get another bounded 5-second wait and reuse a still-pending load. A settled failed load can be retried once the user chooses to retry
- Recovery, total expiry, backgrounding, disposal and real app entry permanently close OTA acquisition for this runtime. Eventual font success can still enter the app, including after the original preparation deadline
- OTA checking, downloading, journal storage and activation share at most 8 seconds and never extend the original 12-second whole deadline
- The existing 380ms completion progress animation and 430ms finish are retained when time remains. The whole deadline caps the finish when necessary

## Update safety

The installed Expo Updates launch policy chooses native or manual ownership. Native startup checks and downloads are observed rather than duplicated. Every activation guard re-reads the latest native context, restart/emergency state, running update and cached candidate. Rollback, unknown policy, incompatible identity, unlinked builds, development/Expo Go/web or unsafe initial navigation skip activation. Missing runtime metadata is resolved only for manifests selected by the installed native Updates API; missing project metadata is not fabricated.

Initial URL and original notification-response lookups have one 600ms absolute cutoff. A late, failed or uncertain result permanently makes startup unsafe to reload. The original notification response is neither consumed nor cleared by the startup guard. Foreground URL/notification activity and inactive/background state seal OTA.

Candidate activation is attempted at most once per project/runtime/candidate journal key. An `entered` journal record requires the same candidate to be actually running when navigation mounts; a successful download/reload request is not success. Real entry after font recovery also records an existing matching attempt without reopening update acquisition.

The existing `momentry.startupReloadFloor` key remains cosmetic. Positive restored values are capped at 0.94; activation writes the existing `0.88` decoration. Restore/save/clear operations have 400ms outer absolute windows bounded by the whole and OTA deadlines where applicable. Their services receive that cutoff and cannot start new reads, writes or deletes after expiry. In-flight native storage cannot be cancelled. Cosmetic work never becomes a candidate-success ledger, and candidate/native guards are repeated after a cosmetic save before native reload.

## Rendering and native splash

The existing light theme, normal splash logo, title/tagline/status copy, colors, styles and geometry are preserved. Provider ordering remains AppThemeProvider → EntriesProvider → StartupGate → Navigation. The accountless local-memory product has no new authentication flow.

Native hiding is requested only from a mounted readable recovery, normal splash or full-size navigation layout. This includes a batched render that skips an intermediate splash frame. Each root mount notifies the handoff once and supports at most three hide attempts, with finite 180ms retry delays for transient rejection. Repeated layouts cannot renew an exhausted budget. Disposal stops retries; a genuine remount can resume handoff from its new readable layout. If the native API permanently rejects or hangs, source code cannot guarantee that the OS splash disappears.

## Verification and limits

Focused source tests cover shared update/resource guards and the actual React root: font stall, retry, failure, late success, remount, StrictMode replay, native handoff, delayed clocks, initial URL/notification uncertainty, cosmetic storage deadlines, native pending candidates, total OTA/whole budgets and post-recovery entry journals. The rendered-root test uses React 19.2.3 and react-test-renderer 19.2.3; renderer deprecation warnings are expected. Run it with the matching QA tools supplied through STARTUP_QA_TYPESCRIPT, STARTUP_QA_REACT and STARTUP_QA_RENDERER. No app dependency installation is needed or included in this change.

Run the original `npm run verify` separately from these focused checks. A blocked aggregate check is not a full application/native pass. Native project/binary provenance, deployed OTA compatibility, simulator/device behavior and native splash appearance require separate verified installed-build testing; they are not established by source tests.

Official SDK 57 references: [Updates](https://docs.expo.dev/versions/v57.0.0/sdk/updates/), [Font](https://docs.expo.dev/versions/v57.0.0/sdk/font/), [SplashScreen](https://docs.expo.dev/versions/v57.0.0/sdk/splash-screen/). Implementation declarations were checked against the current repository lock, including Expo57.0.8, Updates57.0.10, Font57.0.1, Splash57.0.5 and Constants57.0.7, rather than upgrading to newer documentation recommendations.
