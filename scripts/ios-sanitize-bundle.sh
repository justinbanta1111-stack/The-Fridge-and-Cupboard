#!/usr/bin/env bash
# Fix for App Store Connect error ITMS-90685 (CFBundleIdentifier Collision).
#
# The App target has exactly one product (App.app) and no embedded app
# extensions, so any duplicate bundle inside the archive can only arrive via
# the Capacitor web-asset folder reference (ios/App/App/public), which Xcode
# copies verbatim into App.app. Any nested directory that carries an
# Info.plist — a stray *.app, Payload/, or *.bundle left behind by a previous
# build — is treated by Apple as a second bundle and inherits/collides with
# com.thefridgeandcupboard.app.
#
# Usage:
#   scripts/ios-sanitize-bundle.sh prepare            # before xcodebuild archive
#   scripts/ios-sanitize-bundle.sh verify <App.app>   # after export, fails on collision

set -euo pipefail

PUBLIC_DIR="ios/App/App/public"
BUNDLE_ID="${IOS_BUNDLE_ID:-com.thefridgeandcupboard.app}"

prepare() {
  if [ ! -d "$PUBLIC_DIR" ]; then
    echo "==> No $PUBLIC_DIR yet; nothing to sanitize."
    return 0
  fi

  echo "==> Removing nested app bundles from $PUBLIC_DIR"
  # Stray application bundles / TestFlight payload folders.
  find "$PUBLIC_DIR" \( -name '*.app' -o -name '*.appex' -o -name '*.framework' \
    -o -name '*.bundle' -o -name 'Payload' \) -maxdepth 6 -print -exec rm -rf {} + 2>/dev/null || true

  # Any remaining Info.plist inside the web assets would also register as a bundle.
  find "$PUBLIC_DIR" -name 'Info.plist' -print -delete 2>/dev/null || true

  echo "==> Web assets sanitized."
}

verify() {
  local app_path="${1:-}"
  if [ -z "$app_path" ] || [ ! -d "$app_path" ]; then
    echo "verify: missing or invalid .app path: '$app_path'" >&2
    exit 1
  fi

  echo "==> Scanning $app_path for duplicate CFBundleIdentifier=$BUNDLE_ID"
  local hits=0
  while IFS= read -r plist; do
    id="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$plist" 2>/dev/null || true)"
    if [ "$id" = "$BUNDLE_ID" ]; then
      hits=$((hits + 1))
      echo "    $plist"
    fi
  done < <(find "$app_path" -name 'Info.plist')

  if [ "$hits" -gt 1 ]; then
    echo "::error::ITMS-90685: $hits bundles declare $BUNDLE_ID inside $app_path" >&2
    exit 1
  fi
  echo "==> OK: exactly $hits bundle uses $BUNDLE_ID."
}

case "${1:-prepare}" in
  prepare) prepare ;;
  verify) shift; verify "${1:-}" ;;
  *) echo "usage: $0 [prepare|verify <App.app>]" >&2; exit 2 ;;
esac
