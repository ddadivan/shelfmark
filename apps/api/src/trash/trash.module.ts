import { Module } from '@nestjs/common';
import { CronSecretGuard } from '../demo/cron-secret.guard';
import { FoldersModule } from '../folders/folders.module';
import { TrashCleanupController } from './trash-cleanup.controller';
import { TrashCleanupService } from './trash-cleanup.service';
import { TrashController } from './trash.controller';
import { TrashService } from './trash.service';

@Module({
  imports: [FoldersModule],
  controllers: [TrashController, TrashCleanupController],
  providers: [TrashService, TrashCleanupService, CronSecretGuard],
})
export class TrashModule {}
