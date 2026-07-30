# Flutter to Expo migration

The migration preserves the product intent described in [`product-intent.md`](product-intent.md): one private place for diary, movie, and book memories, with account-free local storage and no social feed by default.

## Status

The repository migration is complete. `apps/app` is the only active product application, and the Flutter source, generated native projects, Flutter assets, tool configuration, and committed legacy credentials were removed from the working tree on 2026-07-23.

The retired Flutter identifiers were `kr.co.bonjin.momentry` on iOS and Android. A public lookup performed before retirement returned no Apple App Store result and a Google Play listing response of 404. The migration therefore does not include an in-app transfer flow for public legacy users. Git history remains the recovery source if the legacy schema or implementation must be inspected later.

## Implemented

- New UULab identity `kr.co.uulab.momentry`, EAS project, app-specific Android JKS, Apple Developer App ID, and Match App Store profile
- Expo Router tabs for diary, movies, books, and the full/settings surface
- SQLite-backed local entries with photo, date, rating, source metadata, detail, and delete flow
- Record editing for date, title, rating, body, and photo removal, plus local search and date sorting
- New photo selections are stored as database-backed image data instead of temporary picker cache paths
- Versioned JSON backup export/import is available from Settings; it replaces the local database after full validation, while OS-level device backup remains outside the app's control
- Open Library book discovery and optional environment-driven TMDB movie discovery
- System/light/dark theme persistence
- Native splash plus JS-controlled OTA startup progress
- Notice, FAQ, local-only notification guidance, terms/privacy summaries, support contact, and build/runtime information
- UULab local build, OTA, Fastlane, Match, metadata, and validation harness

## Retained differences and constraints

- The new package ID creates a different mobile sandbox. Data left on internal or QA devices running the retired Flutter build does not appear in Expo automatically.
- The old Git history contains third-party API credentials and signing material. Do not reuse them. Keep current credentials outside Git and rotate any legacy credential that has not already been revoked.
- Full-device backup/restore is not implemented. Local records can be lost when the app is deleted or the device is reset unless the user keeps a JSON backup.
- Local notifications are supported; remote notifications remain intentionally disabled because the product has no verified recipient/event backend for the new package.

## Legacy schema reference

The retired Flutter database was named `momentry_database.db` and contained separate `post` and `book` tables. Diary photos were stored as text-encoded image data. Book ratings were stored in the legacy `stars` field. Movie persistence was incomplete in the retained Flutter database layer.

The Expo app intentionally uses one normalized `entries` table with a `kind` discriminator for `diary`, `movie`, and `book`. This summary is sufficient for future forensic work; exact legacy implementation remains available in Git history.

## Delivery classification

The first compatible iOS and Android binaries have been submitted. Runtime-compatible record editing, search, date, photo persistence, and copy updates qualify for OTA after `npm run preflight:update` passes. Flutter retirement is repository cleanup only and does not require a mobile deployment.
