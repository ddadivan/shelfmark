export interface OnboardingState {
  /** The welcome dialog is open. */
  open: boolean;
  /** "Show welcome again" is waiting for the server. */
  resetting: boolean;
  /** The last reset failed (cleared by the next attempt). */
  resetFailed: boolean;
}
