import {
  AI_JOB_STATUS,
  LINK_IMAGE_KIND,
  SUMMARY_SOURCE,
  type AiJobStatus,
  type LinkImageKind,
  type LinkResponse,
  type SummarySource,
} from '@shelfmark/contracts';
import { linkImagePath } from './images/link-image-path';
import { toLinkKind } from './to-link-kind';
import type { LinkWithTags } from './models/link-with-tags.type';

/**
 * The same-origin path of the stored image of a kind. A link whose capture is pending (its page
 * changed) gets the path with `v=pending`: requesting it triggers the lazy re-capture (a 404 shows
 * the letter). `null` when nothing was captured and nothing is pending.
 */
export function imagePath(
  row: Pick<LinkWithTags, 'id' | 'images' | 'captureAttemptedAt'>,
  kind: LinkImageKind,
): string | null {
  const image = row.images.find((entry) => entry.kind === kind);
  if (image) return linkImagePath(row.id, kind, image.sha256);
  return row.captureAttemptedAt === null ? linkImagePath(row.id, kind) : null;
}

/**
 * Maps a row to the contract. `faviconUrl` and `imageUrl` are same-origin paths to the captured
 * copies (ADR 0027) or `null`; the remote source URLs in the row are never returned.
 */
export function toLinkResponse(row: LinkWithTags): LinkResponse {
  return {
    id: row.id,
    kind: toLinkKind(row.kind),
    folderId: row.folderId,
    url: row.url,
    title: row.title,
    note: row.note,
    faviconUrl: imagePath(row, LINK_IMAGE_KIND.Favicon),
    imageUrl: imagePath(row, LINK_IMAGE_KIND.Preview),
    isFavorite: row.isFavorite,
    pinnedInFolderAt: row.pinnedInFolderAt?.toISOString() ?? null,
    pinned: row.pinnedPosition !== null,
    lastOpenedAt: row.lastOpenedAt?.toISOString() ?? null,
    remindAt: row.remindAt?.toISOString() ?? null,
    tags: row.tags.map((entry) => entry.tag.name).sort((a, b) => a.localeCompare(b, 'en')),
    summary: row.summary,
    summarySource: row.summary === null ? null : toSummarySource(row.summarySource),
    aiStatus: toAiJobStatus(row.aiStatus),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** A stored summary source; anything past the CHECK reads as `user`, so AI never overwrites it. */
export function toSummarySource(value: string | null): SummarySource {
  return value === SUMMARY_SOURCE.Ai ? SUMMARY_SOURCE.Ai : SUMMARY_SOURCE.User;
}

/** The stored job status as the client sees it: the internal `running` reads as `pending`. */
export function toAiJobStatus(value: string | null): AiJobStatus | null {
  if (value === null) return null;
  if (value === 'running') return AI_JOB_STATUS.Pending;
  const known = Object.values(AI_JOB_STATUS) as string[];
  return known.includes(value) ? (value as AiJobStatus) : null;
}
