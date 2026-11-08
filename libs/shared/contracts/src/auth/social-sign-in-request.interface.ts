import type { AuthProvider } from './auth-provider.type';

/** Body of `POST /api/auth/sign-in/social`. Both URLs must be on a trusted origin. */
export interface SocialSignInRequest {
  provider: AuthProvider;
  callbackURL: string;
  errorCallbackURL?: string;
}
