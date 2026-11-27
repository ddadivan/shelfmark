import { Injectable, NotFoundException } from '@nestjs/common';
import {
  LINK_ERROR_MESSAGE,
  READER_LIMIT,
  type ReaderProgress,
  type ReaderProgressRequest,
  type ReaderProgressResponse,
} from '@shelfmark/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { requireLiveLink } from '../links/link-ownership';

const PROGRESS_SELECT = {
  linkId: true,
  fraction: true,
  minutesLeft: true,
  updatedAt: true,
} as const;

function toProgress(row: {
  linkId: string;
  fraction: number;
  minutesLeft: number;
  updatedAt: Date;
}): ReaderProgress {
  return {
    linkId: row.linkId,
    // REAL keeps about seven digits: 0.42 comes back as 0.41999998.
    fraction: Math.round(row.fraction * 10_000) / 10_000,
    minutesLeft: row.minutesLeft,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Reading progress per user and link (`READER_ENDPOINT.Progress`, `LinkProgress`). Every statement
 * filters by the session user and live links; the write is one plain SQL upsert, so the link's
 * `updated_at` stays. A URL change deletes the row (`LinksWriteService.update`).
 */
@Injectable()
export class ReaderProgressService {
  constructor(private readonly prisma: PrismaService) {}

  /** Started and unfinished texts of live links, the most recent first (`ContinueMax`). */
  async list(userId: string): Promise<ReaderProgress[]> {
    const rows = await this.prisma.readingProgress.findMany({
      where: {
        userId,
        fraction: { gte: READER_LIMIT.StartedFraction, lt: READER_LIMIT.DoneFraction },
        link: { deletedAt: null },
      },
      orderBy: [{ updatedAt: 'desc' }, { linkId: 'asc' }],
      take: READER_LIMIT.ContinueMax,
      select: PROGRESS_SELECT,
    });
    return rows.map(toProgress);
  }

  /** A foreign, missing or trashed link is the same 404; no row is `null`. */
  async get(userId: string, linkId: string): Promise<ReaderProgressResponse> {
    const link = await requireLiveLink(this.prisma, userId, linkId, {
      select: { id: true, readingProgress: { select: PROGRESS_SELECT } },
    });
    const row = link.readingProgress[0];
    return { progress: row === undefined ? null : toProgress(row) };
  }

  /** Stores the position of the user's own live link (else 404, nothing written). */
  async save(userId: string, linkId: string, request: ReaderProgressRequest): Promise<void> {
    const written = await this.prisma.$executeRaw`
      INSERT INTO reading_progress (link_id, user_id, fraction, minutes_left, updated_at)
      SELECT l.id, l.user_id, ${request.fraction}::real, ${request.minutesLeft}::smallint, now()
      FROM links l
      WHERE l.id = ${linkId}::uuid AND l.user_id = ${userId}::uuid AND l.deleted_at IS NULL
      ON CONFLICT (link_id) DO UPDATE
        SET fraction = EXCLUDED.fraction, minutes_left = EXCLUDED.minutes_left,
            updated_at = EXCLUDED.updated_at`;
    if (written === 0) throw new NotFoundException(LINK_ERROR_MESSAGE.NotFound);
  }
}
