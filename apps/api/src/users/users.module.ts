import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { MeStatsService } from './me-stats.service';
import { UsersService } from './users.service';

import { AuthModule } from '../auth/auth.module';
import { FoldersModule } from '../folders/folders.module';

@Module({
  imports: [AuthModule, FoldersModule],
  controllers: [UsersController],
  providers: [UsersService, MeStatsService],
})
export class UsersModule {}
