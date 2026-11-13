import type { AuthProvider } from '@shelfmark/contracts';
import type { IconName } from '@shelfmark/ui';

/** A connected sign-in provider as the Account page shows it. */
export interface ConnectedAccountView {
  readonly provider: AuthProvider;
  readonly icon: IconName;
  /** Translation key of the provider's name. */
  readonly nameKey: string;
  /** The date it was connected, in the date format setting. */
  readonly date: string;
}
