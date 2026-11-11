import type { FeedbackMessage, FeedbackMessageKind, FeedbackStatus } from '@shelfmark/contracts';
import type { FeedbackMessageRow } from './models/feedback-message-row.type';

/**
 * Maps a message row to the contract. The database CHECKs guarantee a message row has a kind and
 * a comment; the casts narrow the stored text to the checked value sets. `screenshotUrl` is built by
 * the caller (the owner and admin routes differ).
 */
export function toFeedbackMessage(
  row: FeedbackMessageRow,
  screenshotUrl: (id: string) => string,
): FeedbackMessage {
  return {
    id: row.id,
    kind: row.kind as FeedbackMessageKind,
    text: row.comment ?? '',
    status: row.status as FeedbackStatus,
    reply: row.reply,
    screenshotUrl: row.screenshotType === null ? null : screenshotUrl(row.id),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
