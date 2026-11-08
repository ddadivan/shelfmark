import type { AuthSessionResponse } from './auth-session-response.interface';

/** `GET /api/auth/get-session`: the session, or `null` when signed out. */
export type GetSessionResponse = AuthSessionResponse | null;
