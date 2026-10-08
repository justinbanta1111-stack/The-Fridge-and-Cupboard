# Architecture rules

- Render Home and Back navigation once in the root layout with a reserved safe-area strip; shared page headers stick below it so navigation never covers page content.
- Use the shared CSS navigation offset for the reserved strip, sticky headers, and mobile fixed welcome scene; count the top safe area once to prevent overlap and excess space.
- Align mobile refrigerator layers from the measured banner bottom using one shared offset; preserve door height when moving it so branding sizes stay unchanged.
- Never preload or unlock the singleton audio element while a playback claim exists; replacing its source interrupts the greeting and pending speech.
- Use the router's history index for Back and route to Home when no app history exists; browser history length includes unrelated sites.- Never return or resolve a Capacitor plugin object from an async function or promise; keep it wrapped in a plain object. Plugin proxies answer to `then`, so the promise never settles.
