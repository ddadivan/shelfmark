import { AUTH_PROVIDER } from './auth-provider.const';

export type AuthProvider = (typeof AUTH_PROVIDER)[keyof typeof AUTH_PROVIDER];
