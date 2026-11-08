import type { PrismaService } from '../../src/prisma/prisma.service';

export interface TestDatabase {
  /** Connection string of the in-memory database (loopback, no password). */
  readonly url: string;
  readonly prisma: PrismaService;
  /** Empties every table (keeps the schema); call between tests. */
  truncateAll(): Promise<void>;
  /** Disconnects Prisma and stops the server and the database. */
  close(): Promise<void>;
}
