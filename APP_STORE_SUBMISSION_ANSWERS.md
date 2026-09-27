# App Store submission — every question Apple asks, with your answer

Use this page while filling in App Store Connect. Copy the answers as written.

---

## 1. Build and version

| Question | Answer |
| --- | --- |
| Version number | 1.0.0 |
| Build | the newest TestFlight build (the one you installed and confirmed opens) |
| Copyright | 2026 The Fridge and Cupboard |
| Primary category | Food & Drink |
| Secondary category | Lifestyle |

## 2. Export compliance (asked on every upload)

| Question | Answer |
| --- | --- |
| Does your app use encryption? | Yes |
| Does it qualify for the exemption? | Yes — it only uses standard HTTPS provided by Apple |
| Is it available in France? | Yes |

The app is already marked as exempt in its settings, so this should not be asked again.

## 3. Content rights

| Question | Answer |
| --- | --- |
| Does your app contain, show or access third-party content? | No |

All recipes, text, pictures and the Chef character are your own.

## 4. Advertising identifier (IDFA)

| Question | Answer |
| --- | --- |
| Does this app use the Advertising Identifier? | No |

There is no advertising and no ad software in the app.

## 5. Age rating questionnaire

Answer **None** to every question (violence, sexual content, profanity, gambling,
horror, drugs, contests). Two to watch:

- Alcohol, tobacco or drug references: **Infrequent/Mild** — the app has a Drinks
  section that can mention wine or cocktails.
- Unrestricted web access: **No** — the app does not include a general web browser.

Expected rating: 12+ (or 4+ if you answer None to alcohol as well).

## 6. Sign-in / demo account (Review Information)

Apple must be able to see everything without signing up.

- Sign-in required? **No** — the app works fully without an account.
- Provide a test account anyway, so the reviewer can check the signed-in parts:
  create a normal account with a simple email and password and paste it in the
  Demo Account boxes.

## 7. Notes for the reviewer

Paste this into the Notes box:

> This app works entirely on the device. Recipes, your kitchen list, shopping
> list, shopping trip, saved meals and cooking progress are stored on the phone
> and work with no internet connection — please try it with Wi-Fi and cellular
> turned off. Photo scanning and the Chef's voice need a connection and show a
> clear offline message when there isn't one.
>
> Native features to try: take a photo with the camera (Fridge, Cupboard,
> Freezer, Grocery Store) — the photo you took appears with "Use this photo" and
> "Retake photo"; the share sheet on any recipe; vibration feedback when you tick
> items off in Shopping Trip; expiry reminders arrive as device notifications;
> the app returns to your exact cooking step when you reopen it.
>
> Nothing is sold inside the app. There are no prices, no purchase buttons and
> no links to outside payment. Every feature is open to everyone in the app.
>
> Signed-in users can delete their account permanently inside the app:
> Settings → Delete account.

## 8. Privacy questions (App Privacy section)

Say **Yes, we collect data**, then tick these:

| Data type | Used for | Linked to the user? | Tracking? |
| --- | --- | --- | --- |
| Email address | App functionality (your account) | Yes | No |
| Photos | App functionality (scanning food) | Yes | No |
| Audio data | App functionality (talking to the Chef) | Yes | No |
| User content (saved recipes, lists) | App functionality | Yes | No |
| Product interaction / crash data | Analytics, app performance | No | No |

Answer **No** to "Do you use data for tracking?" everywhere.

Privacy policy URL: https://thefridgeandcupboard.com/privacy

## 9. Subscriptions

Nothing to declare — there are no in-app purchases in this build. If App Store
Connect shows a leftover subscription that was never approved, leave it out of
this version's submission.

## 10. Things Apple has rejected before, and what's now in place

- **2.1 crashes at launch** — caused by two copies of the app engine. Fixed, and
  the build now fails automatically if that ever comes back.
- **4.2 minimum functionality** — the app no longer loads the website; the whole
  app is installed on the phone, works offline, and uses camera, microphone,
  notifications, share sheet, vibration and on-device storage.
- **3.1.1 payments** — no selling, no prices, no outside payment links in the app.
- **5.1.1(v) account deletion** — permanent deletion inside the app.

## 11. What only you can do

1. Start the "iOS TestFlight" build in GitHub Actions (this compiles and signs the app).
2. Install that build and confirm it opens, including in airplane mode.
3. In App Store Connect: select that build, fill in the answers above, add
   screenshots, and press Submit for Review.
