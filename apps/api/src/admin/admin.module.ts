import { Module } from '@nestjs/common';
import { AdminFeedbackService } from './admin-feedback.service';
import { AdminStatsService } from './admin-stats.service';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';

@Module({
  controllers: [AdminController],
  providers: [AdminFeedbackService, AdminStatsService, AdminGuard],
})
export class AdminModule {}
