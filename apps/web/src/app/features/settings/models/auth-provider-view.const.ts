import { AUTH_PROVIDER, type AuthProvider } from '@shelfmark/contracts';
import type { IconName } from '@shelfmark/ui';

/** Logo (brand-mark icon) and translated name of each sign-in provider on the Account page. */
export const AUTH_PROVIDER_VIEW: Readonly<
  Record<AuthProvider, { readonly icon: IconName; readonly nameKey: string }>
> = {
  [AUTH_PROVIDER.Google]: { icon: 'google', nameKey: 'settings.account.connected.google' },
  [AUTH_PROVIDER.GitHub]: { icon: 'github', nameKey: 'settings.account.connected.github' },
};
