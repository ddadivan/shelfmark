import { AuthPending } from './auth-pending.type';
import type { AuthUser } from '@shelfmark/contracts';

export interface AuthState {
  user: AuthUser | null;
  /** The session was requested at least once and answered. */
  loaded: boolean;
  pending: AuthPending | null;
  failed: boolean;
}
