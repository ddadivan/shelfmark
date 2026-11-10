import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AllowAnonymous } from '../common/auth/allow-anonymous.decorator';
import { CronSecretGuard } from '../demo/cron-secret.guard';
import { CRON_ROUTE } from '../demo/models/cron-route.const';
import { TrashCleanupResponseDto } from './dto/trash-cleanup-response.dto';
import { TrashCleanupService } from './trash-cleanup.service';

@ApiTags('cron')
@Controller(CRON_ROUTE.Controller)
export class TrashCleanupController {
  constructor(private readonly cleanup: TrashCleanupService) {}

  // A state-changing GET like the demo cleanup (ADR 0034, 0036): Vercel Cron can only send GET.
  // Public to the session guard because there is no user; `CronSecretGuard` (method level, so it
  // can never be skipped by moving the marker) requires the bearer secret and fails closed.
  @Get(CRON_ROUTE.TrashCleanup)
  @AllowAnonymous()
  @UseGuards(CronSecretGuard)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Delete Trash rows past their retention (Vercel Cron)' })
  @ApiOkResponse({ type: TrashCleanupResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or wrong CRON_SECRET bearer token' })
  run(): Promise<TrashCleanupResponseDto> {
    return this.cleanup.run();
  }
}
