import type { AuthProvider } from '@shelfmark/contracts';

export interface SignInAsOptions {
  email: string;
  name: string;
  /** Default: GitHub. */
  provider?: AuthProvider;
  /** Whether the provider reports the email as verified. Default: true. */
  emailVerified?: boolean;
}
