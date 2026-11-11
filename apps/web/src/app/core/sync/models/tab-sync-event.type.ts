import type { LinkResponse } from '@shelfmark/contracts';
import type { TAB_SYNC_KIND } from './tab-sync-kind.const';

/** What a tab posts, without the sender's user id (added by `TabSyncService.post`). */
export type TabSyncEvent =
  | { readonly kind: typeof TAB_SYNC_KIND.LinkSaved; readonly link: LinkResponse }
  | { readonly kind: typeof TAB_SYNC_KIND.LinkChanged; readonly link: LinkResponse }
  | { readonly kind: typeof TAB_SYNC_KIND.LinkRemoved; readonly id: string }
  | { readonly kind: typeof TAB_SYNC_KIND.LibraryChanged }
  | { readonly kind: typeof TAB_SYNC_KIND.SignedOut }
  | { readonly kind: typeof TAB_SYNC_KIND.SignedIn };
