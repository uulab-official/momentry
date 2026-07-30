# Momentry repository rules

- The active product app is `apps/app`; do not add new Flutter features.
- Flutter has been retired from the working tree. Use Git history only when legacy behavior or schema needs to be inspected; do not restore Flutter project folders.
- Follow `apps/app/AGENTS.md` and the UULab Expo standard for Expo work.
- Treat `docs/product-intent.md` as the source of truth for product scope, copy, data behavior, non-goals, and feature priority. Update it when those decisions change.
- Keep Expo Router files thin and put implementation under `apps/app/src`.
- Never commit `.env`, service-account JSON, JKS/P12/profile files, `credentials.json`, or `key.properties`.
- Do not publish OTA updates for native-sensitive changes. Run `npm run verify` for normal changes and `npm run preflight` before a binary build.
