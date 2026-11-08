import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  FEEDBACK_LIMIT,
  FEEDBACK_MILESTONE,
  FEEDBACK_MILESTONE_DAYS,
  dueFeedbackMilestone,
  type FeedbackMilestone,
  type FeedbackPromptResponse,
  type RecordFeedbackRequest,
} from '@shelfmark/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { FEEDBACK_LOCK_PREFIX } from './models/feedback-advisory-lock.const';
import { FEEDBACK_COMMENT_SEPARATOR } from './models/feedback-comment-separator.const';
import { FEEDBACK_ERROR_MESSAGE } from './models/feedback-error-message.const';

const DAY_MS = 86_400_000;
const KNOWN_MILESTONES: readonly string[] = Object.values(FEEDBACK_MILESTONE);

function isMilestone(value: string): value is FeedbackMilestone {
  return KNOWN_MILESTONES.includes(value);
}

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  /** The milestone to ask about now; null for demo users, before onboarding or when nothing is due. */
  async prompt(userId: string): Promise<FeedbackPromptResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, isDemo: true, onboardingCompletedAt: true },
    });
    if (!user || user.isDemo || user.onboardingCompletedAt === null) return { milestone: null };
    const rows = await this.prisma.feedback.findMany({
      where: { userId },
      select: { milestone: true },
    });
    const answered = new Set(rows.map((row) => row.milestone).filter(isMilestone));
    return { milestone: dueFeedbackMilestone(user.createdAt, new Date(), answered) };
  }

  /** Saves a rating, feedback or a skip. The first write creates the row; a repeat appends the comment. */
  async record(userId: string, request: RecordFeedbackRequest): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, isDemo: true, onboardingCompletedAt: true },
    });
    if (!user) throw new ForbiddenException();
    if (user.isDemo) throw new ForbiddenException(FEEDBACK_ERROR_MESSAGE.DemoUser);
    if (user.onboardingCompletedAt === null) {
      throw new ConflictException(FEEDBACK_ERROR_MESSAGE.OnboardingPending);
    }
    const reachedAt =
      user.createdAt.getTime() + FEEDBACK_MILESTONE_DAYS[request.milestone] * DAY_MS;
    if (Date.now() < reachedAt) {
      throw new ConflictException(FEEDBACK_ERROR_MESSAGE.MilestoneNotReached);
    }

    // The per-user advisory lock serializes parallel writes (first write and appends), so two
    // requests never create two rows or lose an appended comment.
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${FEEDBACK_LOCK_PREFIX + userId}, 0))`;
      const key = { userId_milestone: { userId, milestone: request.milestone } };
      const existing = await tx.feedback.findUnique({ where: key });
      if (!existing) {
        await tx.feedback.create({
          data: {
            userId,
            milestone: request.milestone,
            score: request.score,
            comment: request.comment ?? null,
          },
        });
        return;
      }
      if (existing.score !== request.score) {
        throw new ConflictException(FEEDBACK_ERROR_MESSAGE.ScoreMismatch);
      }
      if (request.comment === undefined) return;
      const combined =
        existing.comment === null
          ? request.comment
          : existing.comment + FEEDBACK_COMMENT_SEPARATOR + request.comment;
      if (combined.length > FEEDBACK_LIMIT.CommentMax) {
        throw new BadRequestException(FEEDBACK_ERROR_MESSAGE.CommentTooLong);
      }
      await tx.feedback.update({ where: key, data: { comment: combined } });
    });
  }
}
