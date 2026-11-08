import type { AuthSession } from './auth-session.interface';
import type { AuthUser } from './auth-user.interface';

/** Body of `GET /api/auth/get-session` when signed in. */
export interface AuthSessionResponse {
  user: AuthUser;
  session: AuthSession;
}
