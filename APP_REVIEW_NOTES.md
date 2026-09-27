# App Review Notes — The Fridge & Cupboard (iOS)

Paste the section below into App Store Connect → App Review Information → Notes.

---

**What the app does**
The Fridge & Cupboard photographs the food you already own (fridge, cupboard,
leftovers, or a grocery shelf) and turns it into recipes, shopping lists and
money-saving tips. It is not a food delivery or ordering app.

**No login and no payment are needed to test the app**
The app opens straight into the main screen. There is no sign-in wall, no
paywall and no permission prompt at launch. A first-time user gets one free
fridge scan and one free cupboard scan, each with full recipe results and voice
or typed conversation, without an account and without a credit card.

Optional test account (only needed to check saved history and account deletion):
- Email: `justin.test@thefridgeandcupboard.com`
- Password: `FridgeChef2026!`

**Free scan flow — what the reviewer sees**
1. Launch. The refrigerator animation plays and Chef Super J greets you.
2. Tap **Scan My Fridge**. The camera prompt appears at that moment only. You
   can instead tap **Use A Photo I Have** and pick any photo of food, including
   a screenshot of a fridge.
3. The detected items appear as readable on-screen text, followed by full
   recipes: ingredients, quantities, temperature, times, step-by-step
   instructions, substitutions, and Save / Share / Email / Text / Print.
4. Tap **Scan My Cupboard** and repeat for the second free scan.
5. Only after both free scans are used does the app suggest creating an
   account or subscribing. Nothing before that point is locked.

**Store Mode** (home screen → Store Mode)
Designed for use inside a grocery store.
- *Scan an item* photographs a shelf, cart, produce, meat or packaged food and
  returns what it is, obvious quality signals (bruising, mold, shriveling,
  ripeness), storage advice and meal ideas. It states when the photo is not
  clear enough rather than guessing.
- *Help me choose* explains unfamiliar ingredients and suggests substitutions.
- *Bulk / Costco planner* uses what the reviewer already scanned to recommend
  worthwhile bulk buys and to avoid duplicates.
- Everything can be sent to the Shopping List in one tap.

**Shopping List** (home screen → Shopping List)
Missing ingredients are added automatically from recipes, and items can be
added, edited, checked off, given quantities and deleted by hand. The list is
grouped by store aisle (Produce, Meat, Seafood, Dairy, Frozen, Pantry, Bakery,
Other) and can be saved, printed, texted, emailed or shared.

**Purchases**
Nothing is sold in this iOS build. It contains no prices, purchase buttons, or
links to an outside payment page, and every feature is available in the app.

**Delete Account**
Home → menu → **Settings & Help** → *Account* → **Delete account**
(also on the Account screen). It permanently deletes the account and all
associated data from inside the app.

**Sign-in**
Email and password, Google, and Sign in with Apple are all offered on the same
screen, including Apple's private email relay.

**Privacy Policy / Terms of Use**
Settings & Help → Legal, and in the footer of every screen.

**Permissions**
- Camera: requested only when a scan is started.
- Microphone / Speech recognition: requested only when voice chat is started.
- Photo library: requested only when the user chooses an existing photo.
Denying any permission never blocks the app: photo upload replaces the camera,
typing replaces the microphone, and Settings & Help explains how to re-enable
them in iPhone Settings.

---

**Native app functionality (Guideline 4.2 — Minimum Functionality)**

The iOS app is not a web view of the website. The entire app is installed on
the device and runs from local storage, and it uses iPhone hardware directly:

- *Works with no connection.* Turn Wi-Fi and cellular off, then launch the app.
  The refrigerator opening, home screen, saved kitchen inventory, saved
  recipes, the grocery list and the Shopping Trip page all open and stay fully
  editable. A message at the bottom explains that photo scanning and Chef's
  voice return with the connection. Everything edited offline is kept and
  synced when the connection comes back.
- *On-device storage.* Kitchen inventory, saved recipes, shopping list,
  shopping trip progress, cooking progress and Chef's conversation memory are
  written to the device, not just to a browser tab, and survive force-quitting
  the app.
- *Native camera.* Fridge, Cupboard, Freezer, Leftovers and Store Mode open the
  iPhone camera through the system camera, show the exact photo taken with
  **Use this photo / Retake photo**, and only then analyse it.
- *Local notifications.* Expiry reminders are scheduled on the device and fire
  even when the app is closed (Settings → allow notifications when asked).
- *System share sheet.* Recipes and shopping lists share through the iOS share
  sheet (Messages, Mail, Notes, AirDrop).
- *Haptics.* The phone gives haptic feedback when a scan completes, a cooking
  step is finished and an item is ticked off in the Shopping Trip.
- *Speech.* Chef listens through the device microphone and speaks back; the
  app resumes the exact cooking step it was on when the app returns to the
  foreground.

**Suggested five-minute review path**
1. Airplane mode ON → launch → home screen, grocery list and Shopping Trip all
   work, offline message visible.
2. Airplane mode OFF → Fridge → take a photo → Use this photo → recipes.
3. Cook a recipe → step-by-step voice guidance with haptics.
4. Share a recipe → iOS share sheet appears.
5. Open Expiry → Use-by reminders → Turn on reminders → Test now to verify the
   notification is scheduled and delivered by iOS.

**Build verification**
The release process rejects the archive before upload if the app contains a
remote launch URL, if its installed start page/assets are missing, or if a
duplicate/dynamic Capacitor framework could cause a launch crash. Online AI,
account and scanning requests still use secure services, but navigation and the
core saved kitchen experience launch from the installed iPhone package.

## Account deletion

Signed-in users delete their account permanently from inside the app:
Settings → Delete account → type DELETE MY ACCOUNT → "Delete my account now".
It removes the account immediately, with no email round trip. Visitors who are
not signed in can still send an email request from the same page.
