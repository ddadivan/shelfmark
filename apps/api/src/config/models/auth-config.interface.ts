import type { AuthProviderCredentials } from './auth-provider-credentials.interface';

export interface AuthConfig {
  /** Signs cookies and OAuth state. Never log or echo it. */
  secret: string;
  /** Public origin of the app (scheme, host, port), no trailing slash. */
  baseUrl: string;
  /** Exact origins allowed for callback URLs and state-changing requests, always including `baseUrl`. */
  trustedOrigins: string[];
  /** Providers without credentials are absent: OAuth for them is simply unavailable. */
  providers: {
    google?: AuthProviderCredentials;
    github?: AuthProviderCredentials;
  };
  /** Same as `AppConfig.isProduction`: drives Secure cookies and https enforcement. */
  isProduction: boolean;
}
