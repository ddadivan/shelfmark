import type { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';

/** The Prisma client or the client of an open transaction: what tag queries run against. */
export type TagDbClient = PrismaService | Prisma.TransactionClient;
