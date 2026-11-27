import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  LINK_ERROR_MESSAGE,
  REMINDER_LIMIT,
  remindAtProblem,
  type LinkResponse,
  type ListRemindersResponse,
  type ReminderCountResponse,
  type SetRemindersBatchResponse,
} from '@shelfmark/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { LINK_INCLUDE } from '../links/models/link-include.const';
import { toLinkResponse } from '../links/to-link-response';
import { requireLiveLink } from '../links/link-ownership';

/**
 * In-app reminders (#275): one `remind_at` per link. A link is due once that time has passed;
 * nothing runs in the background, due-ness is computed on every read. Every statement is scoped to
 * the session user and to live links (a trashed link keeps its reminder and shows it again once
 * restored). Writes are plain SQL so `updated_at` stays: a reminder is not an edit of the link.
 */
@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Due links (the longest due first) and upcoming ones (the soonest first), each capped. */
  async list(userId: string): Promise<ListRemindersResponse> {
    const now = new Date();
    const [due, upcoming] = await Promise.all([
      this.prisma.link.findMany({
        where: { userId, deletedAt: null, remindAt: { lte: now } },
        orderBy: [{ remindAt: 'asc' }, { id: 'asc' }],
        take: REMINDER_LIMIT.ListMax,
        include: LINK_INCLUDE,
      }),
      this.prisma.link.findMany({
        where: { userId, deletedAt: null, remindAt: { gt: now } },
        orderBy: [{ remindAt: 'asc' }, { id: 'asc' }],
        take: REMINDER_LIMIT.ListMax,
        include: LINK_INCLUDE,
      }),
    ]);
    return { due: due.map(toLinkResponse), upcoming: upcoming.map(toLinkResponse) };
  }

  /** How many live links are due: one indexed count, cheap enough to ask on every app open. */
  async count(userId: string): Promise<ReminderCountResponse> {
    const due = await this.prisma.link.count({
      where: { userId, deletedAt: null, remindAt: { lte: new Date() } },
    });
    return { due };
  }

  /** Sets (or with `null` clears) the reminder of one live link; 404 for a foreign or missing one. */
  async set(userId: string, linkId: string, remindAt: string | null): Promise<LinkResponse> {
    const at = this.toTime(remindAt);
    const changed = await this.prisma.$executeRaw`
      UPDATE links SET remind_at = ${at}
      WHERE id = ${linkId}::uuid AND user_id = ${userId}::uuid AND deleted_at IS NULL`;
    if (changed === 0) throw new NotFoundException(LINK_ERROR_MESSAGE.NotFound);
    const row = await requireLiveLink(this.prisma, userId, linkId, {
      include: LINK_INCLUDE,
    });
    return toLinkResponse(row);
  }

  /**
   * The same reminder (or none) on the user's live links among `ids`; foreign, missing and trashed
   * ids are ignored, so the answer never tells whether an id exists for someone else.
   */
  async setMany(
    userId: string,
    ids: readonly string[],
    remindAt: string | null,
  ): Promise<SetRemindersBatchResponse> {
    const at = this.toTime(remindAt);
    await this.prisma.$executeRaw`
      UPDATE links SET remind_at = ${at}
      WHERE user_id = ${userId}::uuid AND deleted_at IS NULL AND id = ANY(${[...ids]}::uuid[])`;
    const rows = await this.prisma.link.findMany({
      where: { userId, deletedAt: null, id: { in: [...ids] } },
      include: LINK_INCLUDE,
    });
    const byId = new Map(rows.map((row) => [row.id, toLinkResponse(row)]));
    const links = ids
      .map((id) => byId.get(id))
      .filter((link): link is LinkResponse => link !== undefined);
    return { updated: links.length, links };
  }

  /** The checked time, or `null` to clear; a past or too distant time is a 400 with its message. */
  private toTime(remindAt: string | null): Date | null {
    if (remindAt === null) return null;
    const problem = remindAtProblem(remindAt, Date.now());
    if (problem) throw new BadRequestException(problem);
    return new Date(remindAt);
  }
}
