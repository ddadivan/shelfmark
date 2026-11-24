import { Module } from '@nestjs/common';
import { CronSecretGuard } from '../demo/cron-secret.guard';
import { AccountPurgeCronController } from './account-purge-cron.controller';
import { AccountPurgeService } from './account-purge.service';
import { UsersController } from './users.controller';
import { MeStatsService } from './me-stats.service';
import { UsersService } from './users.service';

import { AuthModule } from '../auth/auth.module';
import { FoldersModule } from '../folders/folders.module';

@Module({
  imports: [AuthModule, FoldersModule],
  controllers: [UsersController, AccountPurgeCronController],
  providers: [UsersService, MeStatsService, AccountPurgeService, CronSecretGuard],
})
export class UsersModule {}
