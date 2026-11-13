import type { FeedbackMessage, FeedbackMessageKind, FeedbackStatus } from '@shelfmark/contracts';
import type { FeedbackMessageRow } from './models/feedback-message-row.type';
import type { FeedbackScreenshotUrl } from './models/feedback-screenshot-url.type';

/**
 * Maps a message row to the contract. The database CHECKs guarantee a message row has a kind and
 * a comment; the casts narrow the stored text to the checked value sets. The screenshot URLs are
 * built by the caller (the owner and admin routes differ), in position order.
 */
export function toFeedbackMessage(
  row: FeedbackMessageRow,
  screenshotUrl: FeedbackScreenshotUrl,
): FeedbackMessage {
  return {
    id: row.id,
    kind: row.kind as FeedbackMessageKind,
    text: row.comment ?? '',
    status: row.status as FeedbackStatus,
    reply: row.reply,
    screenshotUrls: row.screenshots.map((shot) => screenshotUrl(row.id, shot.position)),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
