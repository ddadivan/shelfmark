import type { Prisma } from '../../generated/prisma/client';
import type { ASK_LINK_SELECT } from './ask-link-select.const';

/** A link row as the Ask tools read it (`ASK_LINK_SELECT`). */
export type AskLinkRow = Prisma.LinkGetPayload<{ select: typeof ASK_LINK_SELECT }>;
