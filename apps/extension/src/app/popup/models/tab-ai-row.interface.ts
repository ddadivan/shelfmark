import type { TabAiStatus } from './tab-ai-status.type';
import type { TabAiTag } from './tab-ai-tag.interface';

/** What "Sort with AI" knows about one tab. */
export interface TabAiRow {
  readonly status: TabAiStatus;
  /** The draft asked for this tab, sent as `aiDraftId` on Save; `null` when no draft was started. */
  readonly draftId: string | null;
  /** One of the user's folders AI picked, or `null`. */
  readonly folderId: string | null;
  /** One or two tags. */
  readonly tags: readonly TabAiTag[];
}
