import type { TAB_SYNC_KIND } from './tab-sync-kind.const';

export type TabSyncKind = (typeof TAB_SYNC_KIND)[keyof typeof TAB_SYNC_KIND];
