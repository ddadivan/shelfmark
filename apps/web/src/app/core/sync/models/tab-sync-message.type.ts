import type { TabSyncEvent } from './tab-sync-event.type';

/** A `TabSyncEvent` on the channel: it names the user it is about, so other accounts ignore it. */
export type TabSyncMessage = TabSyncEvent & { readonly userId: string };
