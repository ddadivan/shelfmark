import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ExactDuplicatesCheck } from './checks/exact-duplicates.check';
import { TagVariantsCheck } from './checks/tag-variants.check';
import { CleanupController } from './cleanup.controller';
import { CleanupService } from './cleanup.service';
import { CLEANUP_CHECKS } from './models/cleanup-checks.token';
import type { CleanupCheck } from './models/cleanup-check.interface';

/**
 * Library clean-up (F5, ADR 0052). Imports `AiModule` (settings, entitlements, usage, search status);
 * `AiModule` never imports this module. `CLEANUP_CHECKS` is the check registry, in run order.
 */
@Module({
  imports: [AiModule],
  controllers: [CleanupController],
  providers: [
    CleanupService,
    ExactDuplicatesCheck,
    TagVariantsCheck,
    {
      provide: CLEANUP_CHECKS,
      useFactory: (...checks: CleanupCheck[]): CleanupCheck[] => checks,
      inject: [ExactDuplicatesCheck, TagVariantsCheck],
    },
  ],
})
export class CleanupModule {}
