import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  PAGE_LIMIT,
  type AdminFeedbackItem,
  type ListAdminFeedbackQuery,
  type ListAdminFeedbackResponse,
  type UpdateAdminFeedbackRequest,
} from '@shelfmark/contracts';
import type { Prisma } from '../generated/prisma/client';
import type { StoredFeedbackScreenshot } from '../feedback/models/stored-feedback-screenshot.interface';
import { toFeedbackMessage } from '../feedback/to-feedback-message';
import { PrismaService } from '../prisma/prisma.service';
import { decodeAdminFeedbackCursor, encodeAdminFeedbackCursor } from './admin-feedback-cursor';
import { ADMIN_FEEDBACK_SELECT } from './models/admin-feedback-select.const';

type AdminRow = Prisma.FeedbackGetPayload<{ select: typeof ADMIN_FEEDBACK_SELECT }>;

/** The admin screenshot path of a message. */
export function adminScreenshotUrl(id: string): string {
  return `/api/admin/feedback/${id}/screenshot`;
}

function toItem(row: AdminRow): AdminFeedbackItem {
  return { ...toFeedbackMessage(row, adminScreenshotUrl), user: row.user };
}

/**
 * Feedback of all users for the author. These are the only queries that are not filtered by the
 * session user: `AdminGuard` (the `ADMIN_EMAILS` allow-list) protects every caller. Only message
 * rows (`kind` set) are ever touched; ratings are not exposed here.
 */
@Injectable()
export class AdminFeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListAdminFeedbackQuery): Promise<ListAdminFeedbackResponse> {
    const limit = query.limit ?? PAGE_LIMIT.Default;
    const where: Prisma.FeedbackWhereInput = { kind: { not: null } };
    if (query.status) where.status = query.status;
    if (query.cursor) {
      const cursor = decodeAdminFeedbackCursor(query.cursor);
      const time = new Date(cursor.t);
      where.AND = [
        { OR: [{ createdAt: { lt: time } }, { createdAt: time, id: { lt: cursor.id } }] },
      ];
    }
    const rows = await this.prisma.feedback.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: ADMIN_FEEDBACK_SELECT,
    });
    const page = rows.slice(0, limit);
    const last = page[page.length - 1];
    return {
      items: page.map(toItem),
      nextCursor: rows.length > limit && last ? encodeAdminFeedbackCursor(last) : null,
    };
  }

  async update(id: string, request: UpdateAdminFeedbackRequest): Promise<AdminFeedbackItem> {
    const data: Prisma.FeedbackUpdateInput = {};
    if (request.status !== undefined) data.status = request.status;
    if (request.reply !== undefined) data.reply = request.reply === '' ? null : request.reply;
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Send a status, a reply or both');
    }
    const existing = await this.prisma.feedback.findFirst({
      where: { id, kind: { not: null } },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException();
    const row = await this.prisma.feedback.update({
      where: { id },
      data,
      select: ADMIN_FEEDBACK_SELECT,
    });
    return toItem(row);
  }

  async findScreenshot(id: string): Promise<StoredFeedbackScreenshot> {
    const row = await this.prisma.feedback.findFirst({
      where: { id, kind: { not: null }, screenshot: { not: null } },
      select: { screenshot: true, screenshotType: true },
    });
    if (!row?.screenshot || !row.screenshotType) throw new NotFoundException();
    return { bytes: row.screenshot, contentType: row.screenshotType };
  }
}
