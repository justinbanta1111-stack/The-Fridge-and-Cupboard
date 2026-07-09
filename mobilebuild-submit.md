# App Store & Google Play Submission Guide — The Fridge & Cupboard

Everything you need to submit the app to both stores. Pair with `mobilebuild-ios.md` and `mobilebuild-android.md` for the actual build steps.

---

## Accounts you must create first

| Store | URL | Cost | What to do |
|---|---|---|---|
| Apple Developer Program | https://developer.apple.com/programs/ | $99/year | Enroll, then register bundle ID `com.thefridgeandcupboard.app` |
| Google Play Console | https://play.google.com/console | $25 one-time | Create app, set application ID `com.thefridgeandcupboard.app` |

---

## Required URLs (all already live)

| URL | Status | Used for |
|---|---|---|
| https://thefridgeandcupboard.com | Live | Marketing URL |
| https://thefridgeandcupboard.com/privacy | Live | Privacy Policy |
| https://thefridgeandcupboard.com/terms | Live | Terms of Service |
| https://thefridgeandcupboard.com/delete-account | Live | Account Deletion |
| support@thefridgeandcupboard.com | Live | Support email |

---

## Screenshots (capture these before submitting)

### iPhone 6.7" (1290×2796) — min 3, max 10
1. Home screen with refrigerator animation
2. Scan My Fridge / camera view
3. Scan My Cupboard
4. Use My Leftovers results
5. Saved recipes
6. Chef Super J voice mode
7. Seniors / health section
8. Subscription / Pro page

### Android phone (1080×1920+) — min 2, max 8
Use the same screens as iOS above.

### Google Play feature graphic
- **1024×500** — hero banner for the Play Store listing
- Include app name, tagline: "Scan your fridge. Cook what you have."

---

## Store listing copy (copy-paste ready)

### App Store (Apple)

**App name:** The Fridge & Cupboard

**Subtitle (30 chars):**
Use what you already have

**Promotional text (170 chars):**
Scan your fridge, cupboard, and leftovers. Get recipes from what you already own. Save money, waste less food, cook smarter with Chef Super J in your pocket.

**Description:**
The Fridge & Cupboard helps you cook with what you already have.

Snap a photo of your fridge, cupboard, or leftovers and get instant recipe ideas tailored to what's on hand. Built by career chef and brain-tumor survivor Justin "Super J" Banta to help families save money, waste less food, and eat better tonight.

WHAT YOU CAN DO
- Scan your fridge — instant ingredient recognition
- Scan your cupboard — pantry-first meal ideas
- Use My Leftovers — rescue last night's dinner
- Before You Shop — check what you can make first
- Use It Soon — eat what's about to go bad
- Saved Recipes — keep your favorites
- Voice cooking mode with Chef Super J

EASY FOR SENIORS & CAREGIVERS
Soft-bite meals, low-energy meals, one-pot meals, brain support, heart-healthy, low-sodium.

SPECIAL HEALTH MODES
Cancer support, brain support, recovery meals, vegan, Lent, and more.

SUBSCRIPTIONS
- Standard — $3.99/month
- Premium / Pro — $5.99/month
Free tier always available. Cancel any time from your phone's subscription settings.

Privacy: thefridgeandcupboard.com/privacy
Terms: thefridgeandcupboard.com/terms

**Keywords (100 chars, comma-separated):**
fridge,cupboard,pantry,recipes,leftovers,meal,scan,grocery,seniors,caregiver,vegan,cancer,brain,save

### Google Play

**Short description (80 chars):**
Scan your fridge & cupboard. Cook what you already have. Save money. Waste less.

**Full description:** Use the same Apple description above (Play allows up to 4000 chars).

---

## App Privacy / Data Safety answers

### Apple App Privacy questionnaire

| Data collected | Linked to user | Purpose |
|---|---|---|
| Email address | Yes | Account, sign-in |
| Photos (fridge/cupboard scans) | Yes | App functionality |
| Purchases | Yes | App functionality |
| Crash data | No | Analytics |
| Usage data | No | Analytics |

No tracking across other apps/sites. No third-party advertising SDKs.

### Google Play Data Safety form

- Data collected: Email, Photos, Purchase history
- Encrypted in transit: Yes
- Users can request deletion: Yes (thefridgeandcupboard.com/delete-account)
- Independent security review: No
- Targets families/children only: No (general audience, all ages)

---

## Native billing (Phase 2 — after first submission)

Apple and Google require their own billing for subscriptions sold inside native apps.

### Apple App Store Connect
1. Go to App Store Connect → your app → In-App Purchases
2. Create:
   - `pro.standard.monthly` — $3.99/mo, auto-renewable subscription
   - `pro.premium.monthly` — $5.99/mo, auto-renewable subscription
3. Add subscription group (e.g. "Pro Membership")

### Google Play Console
1. Go to Play Console → your app → Monetize → Subscriptions
2. Create:
   - `pro_standard_monthly` — $3.99/mo
   - `pro_premium_monthly` — $5.99/mo

### Wire up native billing in code
1. Install `@revenuecat/purchases-capacitor` (recommended) or `@capacitor-community/in-app-purchases`
2. Implement `src/lib/native-billing.ts`:
   - `startNativePurchase(productId)`
   - `restoreNativePurchases()`
   - `getNativeEntitlement()`
3. Keep the existing Stripe web flow for web users (detect native with `Capacitor.isNativePlatform()`)
4. Add a visible **Restore Purchases** button in the app UI (Apple/Google requirement)

---

## OAuth / Sign-in setup

### Apple Sign In (required for App Store approval)
1. Go to https://developer.apple.com/account/resources/identifiers/list/serviceId
2. Register a Service ID (e.g. `com.thefridgeandcupboard.app.signin`)
3. Enable "Sign in with Apple"
4. Add your domain `thefridgeandcupboard.com` to the Return URLs
5. Generate a private key (.p8) for Sign in with Apple
6. Add the Service ID, Key ID, and .p8 content to your backend OAuth settings

### Google Sign In
1. Go to https://console.cloud.google.com/apis/credentials
2. Create iOS OAuth 2.0 client ID with bundle ID `com.thefridgeandcupboard.app`
3. Create Android OAuth 2.0 client ID with package name `com.thefridgeandcupboard.app`
4. Add both client IDs to your backend OAuth settings

---

## Submission order (recommended)

1. Submit to **Google Play Internal Testing** first (fastest review).
2. While waiting, submit to **Apple App Store TestFlight** (external testing).
3. Fix any issues found in testing.
4. Promote Google Play to **Production**.
5. Submit Apple build for **App Store Review**.

---

## Quick reference: bundle IDs and keys

| Platform | Bundle / Package ID | Product IDs (billing) |
|---|---|---|
| iOS | `com.thefridgeandcupboard.app` | `pro.standard.monthly`, `pro.premium.monthly` |
| Android | `com.thefridgeandcupboard.app` | `pro_standard_monthly`, `pro_premium_monthly` |
