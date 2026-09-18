#!/usr/bin/env bash
# Local TestFlight build + upload. Mirrors .github/workflows/ios-testflight.yml.
#
# Requirements (Mac only):
#   - Xcode + command line tools installed
#   - CocoaPods (`sudo gem install cocoapods`)
#   - bun installed
#   - App Store Connect API key with role Admin or App Manager
#
# Required env vars:
#   ASC_KEY_ID                         10-char key ID
#   APP_STORE_CONNECT_API_ISSUER_ID    issuer UUID
#   APP_STORE_CONNECT_API_KEY_P8_PATH  path to AuthKey_XXXX.p8
#   IOS_TEAM_ID                        10-char Apple Developer Team ID
# Optional:
#   IOS_BUNDLE_ID                      default com.thefridgeandcupboard.app
#   BUILD_NUMBER                       default: unix timestamp
#   VERSION_NAME                       default: 1.0.0

set -euo pipefail

if ! grep -Eq '^use_frameworks! *:linkage *=> *:static$' ios/App/Podfile; then
  echo "The required static Capacitor linkage is missing from ios/App/Podfile." >&2
  exit 1
fi
if grep -q "CapApp-SPM" ios/App/App.xcodeproj/project.pbxproj; then
  echo "A second Capacitor package source is present; refusing to build." >&2
  exit 1
fi

: "${ASC_KEY_ID:?missing}"
: "${APP_STORE_CONNECT_API_ISSUER_ID:?missing}"
: "${APP_STORE_CONNECT_API_KEY_P8_PATH:?missing}"
: "${IOS_TEAM_ID:?missing}"

IOS_BUNDLE_ID="${IOS_BUNDLE_ID:-com.thefridgeandcupboard.app}"
BUILD_NUMBER="${BUILD_NUMBER:-$(date +%s)}"
VERSION_NAME="${VERSION_NAME:-1.0.0}"

WORKSPACE="ios/App/App.xcworkspace"
SCHEME="App"
CONFIGURATION="Release"
BUILD_DIR="$(mktemp -d)"
ARCHIVE_PATH="$BUILD_DIR/App.xcarchive"
EXPORT_PATH="$BUILD_DIR/export"
DERIVED_DATA_PATH="$BUILD_DIR/DerivedData"

echo "==> Installing dependencies"
bun install --frozen-lockfile

echo "==> Building web bundle"
NODE_ENV=production bun run build

echo "==> Packaging offline app bundle for the device"
node scripts/build-native-shell.mjs

echo "==> Syncing Capacitor iOS"
bunx cap sync ios

echo "==> Removing plugins that are not used by the iPhone app"
node scripts/ios-prune-unused-plugins.mjs

# Capacitor 8 generates this folder even for CocoaPods-only projects. The
# Xcode project must continue to use CocoaPods as its single Capacitor source.
rm -rf ios/App/CapApp-SPM

echo "==> Verifying the installed app launches locally"
CONFIG="ios/App/App/capacitor.config.json"
START="ios/App/App/public/index.html"
if [ ! -s "$CONFIG" ] || [ ! -s "$START" ]; then
  echo "The installed iPhone app is missing its configuration or local start page." >&2
  exit 1
fi
if node -e 'const c=require("./ios/App/App/capacitor.config.json"); process.exit(c.server && c.server.url ? 0 : 1)'; then
  echo "The iPhone build is configured to open a remote website." >&2
  exit 1
fi
if [ "$(wc -c < "$START" | tr -d ' ')" -lt 10000 ] || ! grep -q '/assets/' "$START"; then
  echo "The packaged start page is incomplete." >&2
  exit 1
fi
if ! grep -q 'tfc.launch.reloaded' "$START"; then
  echo "The packaged start page is missing the launch path guard." >&2
  exit 1
fi
if grep -Eq 'SpeechRecognition|PushNotificationsPlugin' "$CONFIG" || \
   grep -Eq 'CapacitorCommunitySpeechRecognition|CapacitorPushNotifications' ios/App/Podfile; then
  echo "The iPhone package still contains an unused startup plugin." >&2
  exit 1
fi

echo "==> Sanitizing embedded web assets (ITMS-90685 guard)"
IOS_BUNDLE_ID="$IOS_BUNDLE_ID" bash scripts/ios-sanitize-bundle.sh prepare

echo "==> Installing CocoaPods from a clean integration"
(cd ios/App && pod deintegrate || true)
(cd ios/App && rm -rf Pods Podfile.lock App.xcworkspace)
(cd ios/App && pod cache clean --all >/dev/null 2>&1 || true)
rm -rf "$HOME/Library/Developer/Xcode/DerivedData"/*
(cd ios/App && pod install --repo-update)

EMBED_SCRIPT="ios/App/Pods/Target Support Files/Pods-App/Pods-App-frameworks.sh"
if [ -f "$EMBED_SCRIPT" ] && grep -Eq 'install_framework.*Capacitor[^/]*\.framework' "$EMBED_SCRIPT"; then
  echo "CocoaPods plans to embed a dynamic Capacitor framework; refusing to archive." >&2
  grep -E 'install_framework.*Capacitor[^/]*\.framework' "$EMBED_SCRIPT" >&2
  exit 1
fi


echo "==> Installing App Store Connect API key"
mkdir -p "$HOME/.appstoreconnect/private_keys"
cp "$APP_STORE_CONNECT_API_KEY_P8_PATH" \
  "$HOME/.appstoreconnect/private_keys/AuthKey_${ASC_KEY_ID}.p8"

echo "==> Archiving (automatic signing)"
xcodebuild archive \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -archivePath "$ARCHIVE_PATH" \
  -derivedDataPath "$DERIVED_DATA_PATH" \
  -destination 'generic/platform=iOS' \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$APP_STORE_CONNECT_API_KEY_P8_PATH" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$APP_STORE_CONNECT_API_ISSUER_ID" \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM="$IOS_TEAM_ID" \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  MARKETING_VERSION="$VERSION_NAME" \
  COMPILER_INDEX_STORE_ENABLE=NO

echo "==> Verifying Capacitor is statically linked"
APP_PATH="$(find "$ARCHIVE_PATH/Products/Applications" -maxdepth 1 -name '*.app' | head -n 1)"
FRAMEWORKS_PATH="$APP_PATH/Frameworks"
DYNAMIC_CAPACITOR="$(find "$FRAMEWORKS_PATH" -maxdepth 1 -name 'Capacitor*.framework' -print 2>/dev/null || true)"
if [ -n "$DYNAMIC_CAPACITOR" ]; then
  echo "Dynamic Capacitor frameworks found; refusing to export:" >&2
  echo "$DYNAMIC_CAPACITOR" >&2
  exit 1
fi
APP_BIN="$APP_PATH/$(basename "$APP_PATH" .app)"
if nm -u "$APP_BIN" 2>/dev/null | awk '{print $NF}' | grep -qE '^_?\$s9Capacitor'; then
  echo "The archived app has unresolved Capacitor symbols; refusing to export." >&2
  exit 1
fi
if otool -L "$APP_BIN" | grep -qE '@rpath/Capacitor[^/]*\.framework/'; then
  echo "The archived app still loads a dynamic Capacitor framework; refusing to export." >&2
  exit 1
fi

echo "==> Exporting IPA"
cat > "$BUILD_DIR/ExportOptions.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>signingStyle</key><string>automatic</string>
  <key>teamID</key><string>${IOS_TEAM_ID}</string>
  <!-- Keep false: stripping Swift symbols breaks Capacitor plugin linkage at launch. -->
  <key>stripSwiftSymbols</key><false/>
</dict>
</plist>
EOF

xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "$BUILD_DIR/ExportOptions.plist" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$APP_STORE_CONNECT_API_KEY_P8_PATH" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$APP_STORE_CONNECT_API_ISSUER_ID"

IPA_PATH="$(find "$EXPORT_PATH" -name '*.ipa' | head -n 1)"
if [ -z "$IPA_PATH" ]; then
  echo "No .ipa produced" >&2
  exit 1
fi

echo "==> Verifying no CFBundleIdentifier collision"
APP_PATH="$(find "$ARCHIVE_PATH/Products/Applications" -maxdepth 1 -name '*.app' | head -n 1)"
IOS_BUNDLE_ID="$IOS_BUNDLE_ID" bash scripts/ios-sanitize-bundle.sh verify "$APP_PATH"

echo "==> Verifying the exported IPA cannot reproduce the Capacitor dyld crash"
IPA_WORK="$BUILD_DIR/ipa-check"
mkdir -p "$IPA_WORK"
unzip -q "$IPA_PATH" -d "$IPA_WORK"
EXPORTED_APP="$(find "$IPA_WORK/Payload" -maxdepth 1 -name '*.app' | head -n 1)"
EXPORTED_FW="$EXPORTED_APP/Frameworks"
DYNAMIC_CAPACITOR="$(find "$EXPORTED_FW" -maxdepth 1 -name 'Capacitor*.framework' -print 2>/dev/null || true)"
if [ -n "$DYNAMIC_CAPACITOR" ]; then
  echo "Exported IPA contains dynamic Capacitor frameworks; refusing upload:" >&2
  echo "$DYNAMIC_CAPACITOR" >&2
  exit 1
fi
EXPORTED_BIN="$EXPORTED_APP/$(basename "$EXPORTED_APP" .app)"
if nm -u "$EXPORTED_BIN" 2>/dev/null | awk '{print $NF}' | grep -qE '^_?\$s9Capacitor'; then
  echo "Exported IPA has unresolved Capacitor symbols; refusing upload." >&2
  exit 1
fi
if otool -L "$EXPORTED_BIN" | grep -qE '@rpath/Capacitor[^/]*\.framework/'; then
  echo "Exported IPA still loads a dynamic Capacitor framework; refusing upload." >&2
  exit 1
fi
echo "==> Uploading $IPA_PATH to TestFlight"
xcrun altool --upload-app \
  --type ios \
  --file "$IPA_PATH" \
  --apiKey "$ASC_KEY_ID" \
  --apiIssuer "$APP_STORE_CONNECT_API_ISSUER_ID" \
  --verbose

echo "==> Done. Build $BUILD_NUMBER uploaded."
