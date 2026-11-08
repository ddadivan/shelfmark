import type { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';

/** The Prisma client or an interactive transaction client. */
export type FolderDbClient = Prisma.TransactionClient | PrismaService;
