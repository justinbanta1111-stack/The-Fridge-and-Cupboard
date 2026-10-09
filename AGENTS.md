# Architecture rules

- Share one synthesis profile between the prerecorded welcome and all dynamic Chef speech so delivery stays consistent without delaying microphone processing or playback startup.

- Keep the homepage greeting portrait independent of the user's profile photo and shared brand mark so updating it cannot replace either.

- Render Home and Back navigation once in the root layout with a reserved safe-area strip; shared page headers stick below it so navigation never covers page content.
- Use the shared CSS navigation offset for the reserved strip, sticky headers, and mobile fixed welcome scene; count the top safe area once to prevent overlap and excess space.
- Align mobile refrigerator layers from the measured banner bottom using one shared offset; preserve door height when moving it so branding sizes stay unchanged.
- Never preload or unlock the singleton audio element while a playback claim exists; replacing its source interrupts the greeting and pending speech.
- Use the router's numeric history index for Back with Home fallback; retain session-local screen targets and recover an ignored native traversal through router navigation so WKWebView cannot leave Back inert.
- Never return or resolve a Capacitor plugin object from an async function or promise; keep it wrapped in a plain object. Plugin proxies answer to `then`, so the promise never settles.
- Store a person's preferred name only on their own account (auth metadata) or, for guests, in the current browser session; clear name and conversation context whenever the signed-in person changes, so names never leak between users on a shared device.
