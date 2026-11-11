import type { Prisma } from '../../generated/prisma/client';
import type { FEEDBACK_MESSAGE_SELECT } from './feedback-message-select.const';

export type FeedbackMessageRow = Prisma.FeedbackGetPayload<{
  select: typeof FEEDBACK_MESSAGE_SELECT;
}>;
