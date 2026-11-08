import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AllowAnonymous } from '../common/auth/allow-anonymous.decorator';
import { CronSecretGuard } from './cron-secret.guard';
import { DemoCleanupResponseDto } from './dto/demo-cleanup-response.dto';
import { DemoCleanupService } from './demo-cleanup.service';
import { CRON_ROUTE } from './models/cron-route.const';

@ApiTags('cron')
@Controller(CRON_ROUTE.Controller)
export class DemoCleanupController {
  constructor(private readonly cleanup: DemoCleanupService) {}

  // The only state-changing GET (ADR 0034): Vercel Cron can only send GET. Public to the session
  // guard because there is no user; `CronSecretGuard` (method level, so it can never be skipped by
  // moving the marker) requires the bearer secret and fails closed.
  @Get(CRON_ROUTE.DemoCleanup)
  @AllowAnonymous()
  @UseGuards(CronSecretGuard)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Delete expired demo users (Vercel Cron)' })
  @ApiOkResponse({ type: DemoCleanupResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or wrong CRON_SECRET bearer token' })
  run(): Promise<DemoCleanupResponseDto> {
    return this.cleanup.run();
  }
}
