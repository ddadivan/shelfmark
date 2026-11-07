import { Service } from '@angular/core';
import { AuthApi } from './models/auth-api.interface';
import { AuthUser } from './models/auth-user.interface';

/**
 * Production `AuthApi` until the real one (#64) exists: always a guest, and every sign-in
 * fails, so the sign-in page shows its failure notice instead of a fake session.
 */
@Service()
export class UnavailableAuthApi implements AuthApi {
  getSession(): Promise<AuthUser | null> {
    return Promise.resolve(null);
  }

  signIn(): Promise<AuthUser> {
    return Promise.reject(new Error('Sign-in is not available yet'));
  }

  signInDemo(): Promise<AuthUser> {
    return Promise.reject(new Error('Sign-in is not available yet'));
  }

  signOut(): Promise<void> {
    return Promise.resolve();
  }
}
