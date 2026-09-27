# Add Food Restrictions to the Opening Experience

## What will change
- Add one compact, high-visibility section near the top of the home screen, immediately after the opening greeting and before the main actions.
- Use the exact heading, description, and “Set My Food Restrictions” button supplied.
- Open the existing food-preferences screen from that button, preserving the refrigerator opening, voice greeting, scan cards, and every current feature in place.

## Restriction profile
- Expand the existing editor so users can select or enter allergies, medical conditions, foods they cannot eat, religious fasting requirements, special diets, and personal dislikes.
- Validate lengths and allowed values before saving.
- Keep a safe on-device copy for guests and signed-in users, and synchronize signed-in users’ choices with their existing profile record so preferences follow them across devices.
- Remove the current paid-plan lock from safety-related restrictions so every user can record foods they cannot eat.

## Chef enforcement
- Create one canonical restriction summary instead of maintaining separate preference lists.
- Feed that summary into fridge/cupboard scans, recipe generation, meal suggestions, normal Chef conversations, cooking guidance, rescue flows, and Store Mode scans and follow-up questions.
- Treat allergies and “cannot eat” entries as absolute exclusions; treat health conditions and fasting/diet choices as required guidance without presenting medical advice.

## Safety and compatibility
- Preserve existing saved preference keys and migrate/merge them rather than deleting data.
- Keep the existing database table and access rules; add only the missing authenticated data access grant if verification confirms it is absent.
- Do not change the opening animation, male voice, greeting timing, scan/photo flow, subscriptions, pricing, or Apple build configuration.

## Verification
- Test the compact section on phone and desktop sizes.
- Test selecting, entering, saving, reloading, signing in, and profile synchronization.
- Verify the saved restrictions are present in requests for scans, recipes, Chef follow-ups, meal suggestions, cooking guidance, and Store Mode.
- Confirm the current opening sequence and primary home actions remain unchanged, then check the app build diagnostics.
