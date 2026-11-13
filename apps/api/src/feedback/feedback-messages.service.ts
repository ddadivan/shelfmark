import { Injectable, NotFoundException } from '@nestjs/common';
import {
  FEEDBACK_MESSAGE_LIMIT,
  FEEDBACK_STATUS,
  type FeedbackMessage,
  type ListFeedbackMessagesResponse,
  type SendFeedbackRequest,
} from '@shelfmark/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { FeedbackLimitExceededException } from './feedback-limit-exceeded.exception';
import { FEEDBACK_MESSAGE_LOCK_PREFIX } from './models/feedback-message-lock-prefix.const';
import { FEEDBACK_MESSAGE_SELECT } from './models/feedback-message-select.const';
import { FEEDBACK_MESSAGE_WINDOW_MS } from './models/feedback-message-window-ms.const';
import type { StoredFeedbackScreenshot } from './models/stored-feedback-screenshot.interface';
import { toFeedbackMessage } from './to-feedback-message';

const MS_PER_SECOND = 1000;

/** The owner's screenshot path of a message. */
export function ownerScreenshotUrl(id: string): string {
  return `/api/feedback/messages/${id}/screenshot`;
}

/** Feedback messages of one user (story 25). Message rows have a `kind`; rating rows never do. */
@Injectable()
export class FeedbackMessagesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Stores a message. The limit (`PerHourMax` per rolling hour, demo users included) is counted in
   * Postgres under a per-user advisory lock, so parallel requests cannot slip past it. The text,
   * screenshot and client strings are user data: never logged.
   */
  async send(userId: string, request: SendFeedbackRequest): Promise<FeedbackMessage> {
    const screenshot = request.screenshot
      ? Buffer.from(request.screenshot.data, 'base64')
      : undefined;
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${FEEDBACK_MESSAGE_LOCK_PREFIX + userId}, 0))`;
      const now = new Date();
      const recent = await tx.feedback.findMany({
        where: {
          userId,
          kind: { not: null },
          createdAt: { gt: new Date(now.getTime() - FEEDBACK_MESSAGE_WINDOW_MS) },
        },
        orderBy: { createdAt: 'desc' },
        take: FEEDBACK_MESSAGE_LIMIT.PerHourMax,
        select: { createdAt: true },
      });
      if (recent.length >= FEEDBACK_MESSAGE_LIMIT.PerHourMax) {
        // A slot opens when the oldest of the counted messages leaves the window.
        const opensAt = recent[recent.length - 1].createdAt.getTime() + FEEDBACK_MESSAGE_WINDOW_MS;
        throw new FeedbackLimitExceededException(
          Math.max(1, Math.ceil((opensAt - now.getTime()) / MS_PER_SECOND)),
        );
      }
      return tx.feedback.create({
        data: {
          userId,
          kind: request.kind,
          comment: request.text,
          status: FEEDBACK_STATUS.Received,
          screenshot,
          screenshotType: request.screenshot?.type,
          clientAppVersion: request.client?.appVersion,
          clientUserAgent: request.client?.userAgent,
          createdAt: now,
        },
        select: FEEDBACK_MESSAGE_SELECT,
      });
    });
    return toFeedbackMessage(row, ownerScreenshotUrl);
  }

  /** The user's messages, newest first. */
  async list(userId: string): Promise<ListFeedbackMessagesResponse> {
    const rows = await this.prisma.feedback.findMany({
      where: { userId, kind: { not: null } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: FEEDBACK_MESSAGE_LIMIT.ListMax,
      select: FEEDBACK_MESSAGE_SELECT,
    });
    return { items: rows.map((row) => toFeedbackMessage(row, ownerScreenshotUrl)) };
  }

  /** The screenshot of one of the user's messages; a foreign, missing or screenshot-less one is 404. */
  async findScreenshot(userId: string, id: string): Promise<StoredFeedbackScreenshot> {
    const row = await this.prisma.feedback.findFirst({
      where: { id, userId, kind: { not: null }, screenshot: { not: null } },
      select: { screenshot: true, screenshotType: true },
    });
    if (!row?.screenshot || !row.screenshotType) throw new NotFoundException();
    return { bytes: row.screenshot, contentType: row.screenshotType };
  }
}
