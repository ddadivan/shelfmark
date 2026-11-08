import type { SignedInUser } from './signed-in-user.interface';

export interface SignedInDemoUser extends SignedInUser {
  /** ISO time the demo sandbox ends. */
  demoExpiresAt: string;
}
