import { DOCUMENT } from '@angular/common';
import { Service, inject } from '@angular/core';
import { AuthApi } from './models/auth-api.interface';
import { AuthProvider } from './models/auth-provider.type';
import { AuthUser } from './models/auth-user.interface';
import { AUTH_PROVIDER } from './models/auth-provider.const';
import { MOCK_SESSION_STORAGE_KEY } from './models/mock-session-storage-key.const';

const MOCK_USERS: Record<AuthProvider, AuthUser> = {
  [AUTH_PROVIDER.Google]: {
    id: 'mock-google',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    image: null,
    isDemo: false,
  },
  [AUTH_PROVIDER.GitHub]: {
    id: 'mock-github',
    name: 'Grace Hopper',
    email: 'grace@example.com',
    image: null,
    isDemo: false,
  },
};

const MOCK_DEMO_USER: AuthUser = {
  id: 'mock-demo',
  name: 'Demo user',
  email: 'demo@example.com',
  image: null,
  isDemo: true,
};

function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<Record<keyof AuthUser, unknown>>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.email === 'string' &&
    (candidate.image === null || typeof candidate.image === 'string') &&
    typeof candidate.isDemo === 'boolean'
  );
}

/**
 * In-browser stand-in for the real auth API. Starts signed out; the session is one JSON user in
 * `localStorage` under `sm-mock-session`, so a reload keeps it and e2e can seed it. No network.
 */
@Service()
export class MockAuthApi implements AuthApi {
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage ?? null;

  getSession(): Promise<AuthUser | null> {
    return Promise.resolve(this.restore());
  }

  signIn(provider: AuthProvider): Promise<AuthUser> {
    return Promise.resolve(this.persist(MOCK_USERS[provider]));
  }

  signInDemo(): Promise<AuthUser> {
    return Promise.resolve(this.persist(MOCK_DEMO_USER));
  }

  signOut(): Promise<void> {
    this.storage?.removeItem(MOCK_SESSION_STORAGE_KEY);
    return Promise.resolve();
  }

  private restore(): AuthUser | null {
    const raw = this.storage?.getItem(MOCK_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      return isAuthUser(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private persist(user: AuthUser): AuthUser {
    this.storage?.setItem(MOCK_SESSION_STORAGE_KEY, JSON.stringify(user));
    return user;
  }
}
