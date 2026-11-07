import { Global, Module } from '@nestjs/common';
import { readDatabaseConfig } from '../config/database-config';
import { PrismaService } from './prisma.service';

/**
 * Global so domain modules inject `PrismaService` without importing this module. Not imported
 * by `AppModule` until the first feature needs the database (auth, issue #64): the factory
 * validates DATABASE_URL at boot.
 */
@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      useFactory: (): PrismaService => new PrismaService(readDatabaseConfig().connectionString),
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
