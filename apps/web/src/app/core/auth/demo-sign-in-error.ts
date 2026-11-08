import type { DemoError } from './models/demo-error.type';

/** `signInDemo` failed for a reason the user can act on (too many demos, or the sandbox is full). */
export class DemoSignInError extends Error {
  constructor(readonly kind: DemoError) {
    super(`Demo sign-in failed: ${kind}`);
    this.name = 'DemoSignInError';
  }
}
