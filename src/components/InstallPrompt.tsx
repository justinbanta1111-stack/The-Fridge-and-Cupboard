// Auto-popup install prompt is intentionally disabled.
// Installation is now manual-only via the dedicated "Add App to Phone"
// button (see AddToPhoneCard / InstallAppButton). This prevents the
// prompt from covering Stripe checkout, sign-in, trial, and onboarding.
export function InstallPrompt() {
  return null;
}
