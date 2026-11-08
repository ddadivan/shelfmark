import type { Prisma } from '../../generated/prisma/client';
import type { LINK_INCLUDE } from './link-include.const';

/** A link row with its tag names, as loaded with `LINK_INCLUDE`. */
export type LinkWithTags = Prisma.LinkGetPayload<{ include: typeof LINK_INCLUDE }>;
