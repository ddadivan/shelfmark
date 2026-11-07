import { AuthPending } from './auth-pending.type';
import { AuthUser } from './auth-user.interface';

export interface AuthState {
  user: AuthUser | null;
  /** The session was requested at least once and answered. */
  loaded: boolean;
  pending: AuthPending | null;
  failed: boolean;
}
