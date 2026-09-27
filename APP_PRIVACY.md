# App Privacy — App Store Connect answers

Answers below match what the app actually does today. Anything not listed here is **not** collected.

App privacy policy URL: https://thefridgeandcupboard.com/privacy
Terms of Use (EULA) URL: https://thefridgeandcupboard.com/terms

## 1. Do you or your third-party partners collect data from this app?
**Yes.**

## Data types to declare

### Contact Info → Email Address
- Collected: Yes
- Linked to the user: Yes
- Used for tracking: No
- Purposes: App Functionality (account creation, sign-in, password reset, receipts)
- Notes: Only for people who choose to create an account. Sign in with Apple users who choose
  Hide My Email are stored only as the Apple private relay address.

### Identifiers → User ID
- Collected: Yes
- Linked to the user: Yes
- Used for tracking: No
- Purposes: App Functionality (ties saved scans, saved recipes, shopping list and subscription
  status to the right account)

### User Content → Photos or Videos
- Collected: Yes
- Linked to the user: Yes
- Used for tracking: No
- Purposes: App Functionality
- Notes: A fridge, cupboard, leftover or store-shelf photo is sent to the AI service to identify the
  food in it and returned as a list of ingredients. Photos are saved to the account only when the
  person taps Save to their scan history, and can be deleted from Scan History or by deleting the
  account.

### User Content → Audio Data
- Collected: No (not stored)
- Notes: Speech is converted to text on the device or streamed to the speech service only while the
  person is speaking to Chef Super J. No recording is stored on our servers. Because nothing is
  retained or linked to the user, this is not declared as collected. The microphone is never opened
  until the person chooses a voice feature.

### User Content → Other User Content
- Collected: Yes
- Linked to the user: Yes
- Used for tracking: No
- Purposes: App Functionality
- Notes: Typed ingredients, dietary preferences (including allergies and GERD/low-acid settings),
  shopping list items, saved recipes, the cook's own store prices, and recipes shared to the
  community wall.

### Purchases → Purchase History
- Collected: Yes
- Linked to the user: Yes
- Used for tracking: No
- Purposes: App Functionality (subscription status, Restore Purchases)

### Diagnostics → Crash Data / Performance Data
- Collected: Yes
- Linked to the user: No
- Used for tracking: No
- Purposes: App Functionality (fixing crashes and errors)

## Data types explicitly NOT collected
Health & Fitness, Financial Info (card data never touches the app — handled by Apple or Stripe),
Precise or Coarse Location, Contacts, Browsing History, Search History, Sensitive Info,
Advertising Data, and any data used for tracking or shared with data brokers.

## Tracking
**The app does not track users** across apps or websites owned by other companies. No App Tracking
Transparency prompt is required, and no advertising identifiers are used.

## Account deletion
In-app deletion is available: Settings & Help → Delete Account, also at
https://thefridgeandcupboard.com/delete-account. Deletion removes the account, scans, photos,
preferences, shopping list, saved recipes and store prices.

## Permission purpose strings (match Info.plist)
- Camera: "The Fridge & Cupboard uses the camera to scan the food in your fridge and cupboard so
  Chef Super J can suggest recipes."
- Microphone: "Chef Super J needs microphone access so you can talk through recipes and kitchen
  ideas hands-free."
- Speech Recognition: "Chef Super J uses speech recognition to understand your hands-free cooking
  questions."
- Photo Library: "Used to select photos of your fridge or cupboard for ingredient scanning."

## Third parties that receive data (list in the privacy policy)
- Lovable Cloud (Supabase) — account, scans, preferences, subscription records (hosting/storage)
- Lovable AI Gateway (Google Gemini) — photo and text sent for food identification and meal ideas
- ElevenLabs — text of Chef Super J's reply sent to generate speech
- Apple — Sign in with Apple, in-app purchase and subscription handling
- Stripe — web subscriptions only (never in the iOS app)

Children: the app is rated 4+ but is not directed at children and does not knowingly collect data
from children under 13.
