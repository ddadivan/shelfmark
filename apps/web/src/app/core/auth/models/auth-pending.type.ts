import { AUTH_DEMO } from './auth-pending.const';
import type { AuthProvider } from '@shelfmark/contracts';

/** The sign-in action that is currently running. */
export type AuthPending = AuthProvider | typeof AUTH_DEMO;
