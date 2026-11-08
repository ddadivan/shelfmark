import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CronSecretGuard } from './cron-secret.guard';
import { DemoCleanupController } from './demo-cleanup.controller';
import { DemoCleanupService } from './demo-cleanup.service';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';

@Module({
  imports: [AuthModule],
  controllers: [DemoController, DemoCleanupController],
  providers: [DemoService, DemoCleanupService, CronSecretGuard],
})
export class DemoModule {}
