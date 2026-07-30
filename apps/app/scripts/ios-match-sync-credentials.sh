#!/usr/bin/env bash
# Pull iOS distribution cert + provisioning profile from fastlane match repo.
# Run once after `fastlane spaceauth` to populate credentials/ for local EAS builds.
# Usage: MATCH_READONLY=false bash scripts/ios-match-sync-credentials.sh

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MATCH_GIT_URL="${MATCH_GIT_URL:-https://github.com/uulab-official/certificates.git}"
BUNDLE_ID="${BUNDLE_ID:-$(node -e 'const fs=require("fs"); const p=fs.existsSync("./app.base.json")?"./app.base.json":"./app.json"; console.log(require(p).expo?.ios?.bundleIdentifier || "")')}"
TEAM_ID="${TEAM_ID:-$(ruby -e "file='fastlane/Appfile'; if File.exist?(file); text=File.read(file); puts(text[/team_id\\(['\\\"]([^'\\\"]+)['\\\"]\\)/, 1] || ''); end" 2>/dev/null || echo '')}"
MATCH_TYPE="${MATCH_TYPE:-appstore}"
MATCH_READONLY="${MATCH_READONLY:-true}"
P12_PASSWORD="${P12_PASSWORD:-}"
P12_PATH="${P12_PATH:-credentials/ios-distribution.p12}"
PROFILE_PATH="${PROFILE_PATH:-credentials/ios-app-store.mobileprovision}"

MATCH_OUTPUT_DIR="$(mktemp -d)"
cleanup() { rm -rf "$MATCH_OUTPUT_DIR"; }
trap cleanup EXIT

if [[ -z "$BUNDLE_ID" ]]; then echo "BUNDLE_ID is empty." >&2; exit 1; fi
if [[ -z "${MATCH_PASSWORD:-}" ]]; then read -r -s -p "Enter MATCH_PASSWORD: " MATCH_PASSWORD; echo ""; fi
P12_PASSWORD="${P12_PASSWORD:-$MATCH_PASSWORD}"

mkdir -p credentials

args=(
  "$MATCH_TYPE"
  --git_url "$MATCH_GIT_URL"
  --app_identifier "$BUNDLE_ID"
  --clone_branch_directly true
  --output_path "$MATCH_OUTPUT_DIR"
)
[[ -n "$TEAM_ID" ]] && args+=(--team_id "$TEAM_ID")
[[ "$MATCH_READONLY" == "true" ]] && args+=(--readonly --skip_certificate_matching true)

echo "== match: bundleId=$BUNDLE_ID type=$MATCH_TYPE readonly=$MATCH_READONLY"
MATCH_PASSWORD="$MATCH_PASSWORD" fastlane match "${args[@]}"

PROFILE_SOURCE="$(find "$MATCH_OUTPUT_DIR" "$HOME/Library/MobileDevice/Provisioning Profiles" -type f -name '*.mobileprovision' 2>/dev/null | while read -r f; do plist="$(mktemp)"; openssl smime -inform der -verify -noverify -in "$f" -out "$plist" >/dev/null 2>&1 && id=$(/usr/libexec/PlistBuddy -c 'Print :Entitlements:application-identifier' "$plist" 2>/dev/null) && rm -f "$plist" && [[ "${id#*.}" == "$BUNDLE_ID" ]] && echo "$f" && break; rm -f "$plist"; done || true)"
P12_SOURCE="$(find "$MATCH_OUTPUT_DIR" -type f -name '*.p12' -print -quit 2>/dev/null || true)"

[[ -z "$PROFILE_SOURCE" ]] && { echo "No mobileprovision for $BUNDLE_ID" >&2; exit 2; }
[[ -z "$P12_SOURCE" ]] && { echo "No .p12 in match output" >&2; exit 3; }

cp "$PROFILE_SOURCE" "$PROFILE_PATH"
P12_STEM="$(basename "$P12_SOURCE" .p12)"
CERT_SOURCE="$(find "$MATCH_OUTPUT_DIR" -type f -name "${P12_STEM}.cer" -print -quit 2>/dev/null || true)"
if openssl pkey -in "$P12_SOURCE" -noout >/dev/null 2>&1; then
  [[ -z "$CERT_SOURCE" ]] && { echo "No matching .cer for decrypted Match private key" >&2; exit 4; }
  CERT_PEM="$MATCH_OUTPUT_DIR/${P12_STEM}.pem"
  openssl x509 -inform DER -in "$CERT_SOURCE" -out "$CERT_PEM"
  # macOS security(1) cannot import the newer OpenSSL 3 PKCS#12 defaults used
  # by some match exports. Keep the local EAS credential broadly compatible.
  openssl pkcs12 -export -legacy -inkey "$P12_SOURCE" -in "$CERT_PEM" -out "$P12_PATH" -passout "pass:$P12_PASSWORD"
else
  cp "$P12_SOURCE" "$P12_PATH"
fi
chmod 600 "$P12_PATH" "$PROFILE_PATH"
echo "== Saved: $PROFILE_PATH  $P12_PATH"
P12_PASSWORD="$P12_PASSWORD" bash scripts/ios-verify-signing.sh
echo "PASS: iOS credentials ready for EAS local builds."
