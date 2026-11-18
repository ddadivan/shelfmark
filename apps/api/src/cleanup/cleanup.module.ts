import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { CLEANUP_TICK_HOOK } from '../ai/models/cleanup-tick-hook.token';
import { ExactDuplicatesCheck } from './checks/exact-duplicates.check';
import { NearDuplicatesCheck } from './checks/near-duplicates.check';
import { TagVariantsCheck } from './checks/tag-variants.check';
import { CleanupController } from './cleanup.controller';
import { CleanupRunnerService } from './cleanup-runner.service';
import { CleanupService } from './cleanup.service';
import { CLEANUP_CHECKS } from './models/cleanup-checks.token';
import type { CleanupCheck } from './models/cleanup-check.interface';

/**
 * Library clean-up (F5, ADR 0052). Imports `AiModule` (settings, entitlements, usage, search status);
 * `AiModule` never imports this module; the AI tick and sweep reach the runner through
 * `CLEANUP_TICK_HOOK`. `CLEANUP_CHECKS` is the check registry, in run order.
 */
@Module({
  imports: [AiModule],
  controllers: [CleanupController],
  providers: [
    CleanupService,
    CleanupRunnerService,
    // Resolved lazily by the AI tick and sweep (AiModule never imports this module).
    { provide: CLEANUP_TICK_HOOK, useExisting: CleanupRunnerService },
    ExactDuplicatesCheck,
    TagVariantsCheck,
    NearDuplicatesCheck,
    {
      provide: CLEANUP_CHECKS,
      useFactory: (...checks: CleanupCheck[]): CleanupCheck[] => checks,
      inject: [ExactDuplicatesCheck, TagVariantsCheck, NearDuplicatesCheck],
    },
  ],
})
export class CleanupModule {}
