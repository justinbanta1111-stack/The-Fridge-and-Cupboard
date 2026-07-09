# App Store & Google Play Listing — The Fridge & Cupboard

Drop-in copy and asset checklist for App Store Connect and Google Play Console.
Pair with `CAPACITOR.md` for the native build steps.

---

## Identity

- **App name:** The Fridge & Cupboard
- **Bundle ID (iOS) / Application ID (Android):** `com.TheFridgeandCupboard.app`
- **Primary category:** Food & Drink
- **Secondary category:** Lifestyle
- **Support email:** support@thefridgeandcupboard.com
- **Marketing URL:** https://thefridgeandcupboard.com
- **Privacy Policy URL:** https://thefridgeandcupboard.com/privacy
- **Terms URL:** https://thefridgeandcupboard.com/terms
- **Account deletion:** https://thefridgeandcupboard.com/delete-account

---

## App Store (Apple) copy

**Subtitle (30 chars max):**
Use what you already have

**Promotional text (170 chars):**
Scan your fridge, cupboard, and leftovers. Get recipes from what you already own. Save money, waste less food, cook smarter — with Chef Super J in your pocket.

**Description:**
The Fridge & Cupboard helps you cook with what you already have.

Snap a photo of your fridge, cupboard, or leftovers and get instant recipe ideas tailored to what's on hand. Built by career chef and brain-tumor survivor Justin "Super J" Banta to help families save money, waste less food, and eat better tonight.

WHAT YOU CAN DO
• Scan your fridge — instant ingredient recognition
• Scan your cupboard — pantry-first meal ideas
• Use My Leftovers — rescue last night's dinner
• Before You Shop — check what you can make first
• Use It Soon — eat what's about to go bad
• Saved Recipes — keep your favorites
• Voice cooking mode with Chef Super J

EASY FOR SENIORS & CAREGIVERS
Soft-bite meals, low-energy meals, one-pot meals, brain support, heart-healthy, low-sodium.

SPECIAL HEALTH MODES
Cancer support, brain support, recovery meals, vegan, Lent, and more.

SUBSCRIPTIONS
• Standard — $3.99/month
• Premium / Pro — $5.99/month
Free tier always available. Cancel any time from your phone's subscription settings.

Privacy: thefridgeandcupboard.com/privacy
Terms: thefridgeandcupboard.com/terms

**Keywords (100 chars, comma-sep):**
fridge,cupboard,pantry,recipes,leftovers,meal,scan,grocery,seniors,caregiver,vegan,cancer,brain,save

**Promotional video / app preview:** optional, 15–30s portrait MP4.

---

## Google Play copy

**Short description (80 chars):**
Scan your fridge & cupboard. Cook what you already have. Save money. Waste less.

**Full description:** (use Apple description above; Play allows up to 4000 chars)

---

## Required visual assets

Source files live in `resources/`:
- `resources/icon.png` — 1024×1024 source for `capacitor-assets generate`
- `resources/splash.png` — 2732×2732 source for `capacitor-assets generate`

### App Store Connect
- [ ] 1024×1024 app icon (no alpha) — auto-derived from `resources/icon.png`
- [ ] 6.7" iPhone screenshots, 1290×2796, min 3 / max 10
- [ ] 6.5" iPhone screenshots, 1242×2688 (optional fallback)
- [ ] 12.9" iPad Pro screenshots, 2048×2732 (only if shipping iPad build)
- [ ] App preview video (optional)

### Google Play Console
- [ ] 512×512 high-res icon
- [ ] 1024×500 feature graphic
- [ ] Phone screenshots, min 1080×1920, min 2 / max 8
- [ ] 7" tablet screenshots (optional)
- [ ] Promo video URL (optional, YouTube)

Suggested screenshot set (capture from `/`, `/scan`, `/cupboard`, `/rescue`,
`/seniors`, `/health`, `/pro`, `/use-it-soon`).

---

## Apple App Privacy questionnaire — quick answers

| Data collected | Linked to user | Purpose |
|---|---|---|
| Email address | Yes | Account, sign-in |
| Photos (fridge/cupboard scans) | Yes | App functionality |
| Purchases | Yes | App functionality |
| Crash data | No | Analytics |
| Usage data | No | Analytics |

No tracking across other apps/sites. No third-party advertising SDKs.

---

## Google Play Data Safety form — quick answers

- Data collected: Email, Photos, Purchase history
- Encrypted in transit: Yes
- Users can request deletion: Yes (`/delete-account`)
- Independent security review: No
- Targets families/children only: No (general audience, all ages)

---

## Subscriptions on the stores (when you switch from web Stripe to native IAP)

See `src/lib/native-billing.ts` for the placeholder integration points.

- Apple App Store Connect → In-App Purchases:
  - `pro.standard.monthly` — $3.99/mo, auto-renewable
  - `pro.premium.monthly`  — $5.99/mo, auto-renewable
- Google Play Console → Monetize → Subscriptions:
  - `pro_standard_monthly` — $3.99/mo
  - `pro_premium_monthly`  — $5.99/mo

Both stores require a working "Restore Purchases" button — wire it to
`restoreNativePurchases()` in `src/lib/native-billing.ts` once a billing
plugin (e.g. `@revenuecat/purchases-capacitor` or
`@capacitor-community/in-app-purchases`) is installed.
