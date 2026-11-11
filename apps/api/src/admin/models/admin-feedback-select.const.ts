import type { Prisma } from '../../generated/prisma/client';
import { FEEDBACK_MESSAGE_SELECT } from '../../feedback/models/feedback-message-select.const';

/** A message row plus its sender (name and email only). Never the screenshot bytes. */
export const ADMIN_FEEDBACK_SELECT = {
  ...FEEDBACK_MESSAGE_SELECT,
  user: { select: { name: true, email: true } },
} as const satisfies Prisma.FeedbackSelect;
