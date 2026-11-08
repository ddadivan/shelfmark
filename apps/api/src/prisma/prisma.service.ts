import type { OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const POOL_MAX = 5;

/**
 * The single Prisma client of the API, created by the factory in `PrismaModule`. Nothing
 * connects at construction or bootstrap: the `pg` pool opens connections on the first query,
 * so app boot and `/api/health` never touch the database.
 */
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(connectionString: string) {
    super({ adapter: new PrismaPg({ connectionString, max: POOL_MAX }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
