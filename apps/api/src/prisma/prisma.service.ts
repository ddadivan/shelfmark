import type { OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { DATABASE_POOL_LIMIT } from '../config/models/database-pool-limit.const';
import { PrismaClient } from '../generated/prisma/client';

/**
 * The single Prisma client of the API, created by the factory in `PrismaModule`. Nothing
 * connects at construction or bootstrap: the `pg` pool opens connections on the first query,
 * so app boot and `/api/health` never touch the database.
 */
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(connectionString: string, poolMax: number = DATABASE_POOL_LIMIT.Default) {
    super({ adapter: new PrismaPg({ connectionString, max: poolMax }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
