import type { Prisma } from '../../generated/prisma/client';

/**
 * The columns of a message row the API returns. Never the screenshot bytes: only the positions of
 * the screenshots, for their URLs.
 */
export const FEEDBACK_MESSAGE_SELECT = {
  id: true,
  kind: true,
  comment: true,
  status: true,
  reply: true,
  screenshots: { select: { position: true }, orderBy: { position: 'asc' } },
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.FeedbackSelect;
