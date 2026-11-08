import { AuthPending } from './auth-pending.type';
import type { DemoError } from './demo-error.type';
import type { AuthUser } from '@shelfmark/contracts';

export interface AuthState {
  user: AuthUser | null;
  /** The session was requested at least once and answered. */
  loaded: boolean;
  pending: AuthPending | null;
  failed: boolean;
  /** Set when the last demo sign-in failed with a reason the user can act on. */
  demoError: DemoError | null;
}
