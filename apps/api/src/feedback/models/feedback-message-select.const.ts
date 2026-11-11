import type { Prisma } from '../../generated/prisma/client';

/** The columns of a message row the API returns. Never the `screenshot` bytes: only their type. */
export const FEEDBACK_MESSAGE_SELECT = {
  id: true,
  kind: true,
  comment: true,
  status: true,
  reply: true,
  screenshotType: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.FeedbackSelect;
