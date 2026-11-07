import { AUTH_DEMO } from './auth-pending.const';
import { AuthProvider } from './auth-provider.type';

/** The sign-in action that is currently running. */
export type AuthPending = AuthProvider | typeof AUTH_DEMO;
