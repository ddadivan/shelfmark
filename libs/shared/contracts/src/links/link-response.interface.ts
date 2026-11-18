import type { AiJobStatus } from '../ai/ai-job-status.type';
import type { SummarySource } from '../ai/summary-source.type';
import type { LinkKind } from './link-kind.type';

/** A saved link as returned by the API. */
export interface LinkResponse {
  id: string;
  /** Video, article, shopping or other (ADR 0038). */
  kind: LinkKind;
  /** `null` = "Unsorted". */
  folderId: string | null;
  url: string;
  title: string;
  note: string | null;
  /** Same-origin path `/api/links/{id}/favicon?v=<hash>` when a copy was captured (ADR 0027), `v=pending` while a re-capture after a URL change is pending, else `null`. */
  faviconUrl: string | null;
  /** Same-origin path `/api/links/{id}/image?v=<hash>` when a copy was captured (ADR 0027), `v=pending` while a re-capture after a URL change is pending, else `null`. */
  imageUrl: string | null;
  isFavorite: boolean;
  /** ISO time the link was pinned to the top of its folder; `null` = not pinned. Pinned links come first in the `pinned` list of a folder page. */
  pinnedInFolderAt: string | null;
  /** Pinned to the sidebar (see `/api/pins`). */
  pinned: boolean;
  /** ISO timestamp of the last open; `null` if never opened. */
  lastOpenedAt: string | null;
  /** ISO time of the link's reminder (#275); due once it has passed; `null` = no reminder. */
  remindAt: string | null;
  /** Tag names. */
  tags: string[];
  /** Short summary (#391): plain text, at most `AI_LIMIT.SummaryMax`; `null` when there is none. */
  summary: string | null;
  /** `ai` while AI wrote it (shown with the AI mark), `user` once the user wrote or edited it; `null` with no summary. */
  summarySource: SummarySource | null;
  /** Latest AI job of the link (cards show a skeleton while `pending`); `null` when AI never ran for it. */
  aiStatus: AiJobStatus | null;
  createdAt: string;
  updatedAt: string;
}
