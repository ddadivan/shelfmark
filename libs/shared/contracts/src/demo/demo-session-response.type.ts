import type { AuthSessionResponse } from '../auth/auth-session-response.interface';

/** Body of `POST /api/demo` (201): the new demo user and session, same shape as `get-session`. */
export type DemoSessionResponse = AuthSessionResponse;
