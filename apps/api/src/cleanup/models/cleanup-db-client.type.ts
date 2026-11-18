import type { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';

/** The Prisma client or the client of an open transaction. */
export type CleanupDbClient = PrismaService | Prisma.TransactionClient;
