# Architecture rules

- Render Home and Back navigation once in the root layout with a reserved safe-area strip; shared page headers stick below it so navigation never covers page content.
- Use the shared CSS navigation offset for the reserved strip, sticky headers, and mobile fixed welcome scene; count the top safe area once to prevent overlap and excess space.
- Use the router's history index for Back and route to Home when no app history exists; browser history length includes unrelated sites.