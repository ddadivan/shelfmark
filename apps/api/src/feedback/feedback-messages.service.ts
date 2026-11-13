import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  FEEDBACK_MESSAGE_LIMIT,
  FEEDBACK_SCREENSHOT_ERROR_MESSAGE,
  FEEDBACK_STATUS,
  feedbackScreenshotsPath,
  type FeedbackMessage,
  type FeedbackScreenshotUpload,
  type ListFeedbackMessagesResponse,
  type SendFeedbackRequest,
} from '@shelfmark/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { FeedbackLimitExceededException } from './feedback-limit-exceeded.exception';
import { isScreenshotPosition } from './is-screenshot-position';
import { FEEDBACK_MESSAGE_LOCK_PREFIX } from './models/feedback-message-lock-prefix.const';
import { FEEDBACK_SCREENSHOT_LOCK_PREFIX } from './models/feedback-screenshot-lock-prefix.const';
import { FEEDBACK_MESSAGE_SELECT } from './models/feedback-message-select.const';
import { FEEDBACK_MESSAGE_WINDOW_MS } from './models/feedback-message-window-ms.const';
import type { StoredFeedbackScreenshot } from './models/stored-feedback-screenshot.interface';
import { toFeedbackMessage } from './to-feedback-message';

const MS_PER_SECOND = 1000;

/** The owner's path of one screenshot of a message. */
export function ownerScreenshotUrl(id: string, position: number): string {
  return `${feedbackScreenshotsPath(id)}/${position}`;
}

/** Feedback messages of one user (story 25). Message rows have a `kind`; rating rows never do. */
@Injectable()
export class FeedbackMessagesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Stores a message. The limit (`PerHourMax` per rolling hour, demo users included) is counted in
   * Postgres under a per-user advisory lock, so parallel requests cannot slip past it. The text
   * and client strings are user data: never logged. Screenshots follow with `attachScreenshot`.
   */
  async send(userId: string, request: SendFeedbackRequest): Promise<FeedbackMessage> {
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

  /**
   * Attaches one screenshot to one of the user's messages, as the next position. A foreign,
   * missing or rating row is 404; the 4th screenshot, or one sent later than
   * `ScreenshotAttachWindowMs` after the message, is 400 with a clear message. A per-message
   * advisory lock keeps parallel uploads from taking the same position or passing the limit. The
   * bytes are user data: never logged.
   */
  async attachScreenshot(
    userId: string,
    id: string,
    upload: FeedbackScreenshotUpload,
  ): Promise<FeedbackMessage> {
    const bytes = Buffer.from(upload.data, 'base64');
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${FEEDBACK_SCREENSHOT_LOCK_PREFIX + id}, 0))`;
      const message = await tx.feedback.findFirst({
        where: { id, userId, kind: { not: null } },
        select: { createdAt: true, _count: { select: { screenshots: true } } },
      });
      if (!message) throw new NotFoundException();
      const count = message._count.screenshots;
      if (count >= FEEDBACK_MESSAGE_LIMIT.ScreenshotsMax) {
        throw new BadRequestException(FEEDBACK_SCREENSHOT_ERROR_MESSAGE.TooMany);
      }
      if (
        Date.now() - message.createdAt.getTime() >
        FEEDBACK_MESSAGE_LIMIT.ScreenshotAttachWindowMs
      ) {
        throw new BadRequestException(FEEDBACK_SCREENSHOT_ERROR_MESSAGE.TooLate);
      }
      await tx.feedbackScreenshot.create({
        data: { feedbackId: id, position: count, bytes, type: upload.type },
        select: { position: true },
      });
      return tx.feedback.findUniqueOrThrow({ where: { id }, select: FEEDBACK_MESSAGE_SELECT });
    });
    return toFeedbackMessage(row, ownerScreenshotUrl);
  }

  /** One screenshot of one of the user's messages; foreign, missing or a free position is 404. */
  async findScreenshot(
    userId: string,
    id: string,
    position: number,
  ): Promise<StoredFeedbackScreenshot> {
    if (!isScreenshotPosition(position)) throw new NotFoundException();
    const row = await this.prisma.feedbackScreenshot.findFirst({
      where: { feedbackId: id, position, feedback: { userId, kind: { not: null } } },
      select: { bytes: true, type: true },
    });
    if (!row) throw new NotFoundException();
    return { bytes: row.bytes, contentType: row.type };
  }
}
