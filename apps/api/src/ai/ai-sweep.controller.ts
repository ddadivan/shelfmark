import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AllowAnonymous } from '../common/auth/allow-anonymous.decorator';
import { CronSecretGuard } from '../demo/cron-secret.guard';
import { CRON_ROUTE } from '../demo/models/cron-route.const';
import { AiCatchUpService } from './catch-up/ai-catch-up.service';
import { AiSweepResponseDto } from './dto/ai-sweep-response.dto';

@ApiTags('cron')
@Controller(CRON_ROUTE.Controller)
export class AiSweepController {
  constructor(private readonly catchUp: AiCatchUpService) {}

  // A state-changing GET like the other crons (ADR 0034, 0048): Vercel Cron can only send GET.
  // Public to the session guard because there is no user; `CronSecretGuard` (method level, so it
  // can never be skipped by moving the marker) requires the bearer secret and fails closed.
  @Get(CRON_ROUTE.AiSweep)
  @AllowAnonymous()
  @UseGuards(CronSecretGuard)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Daily AI sweep (Vercel Cron)',
    description:
      'Fails jobs whose attempts are used up, deletes unattached drafts older than a day and starts the catch-up of every user with work (after the response, 25 s budget).',
  })
  @ApiOkResponse({ type: AiSweepResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or wrong CRON_SECRET bearer token' })
  run(): Promise<AiSweepResponseDto> {
    return this.catchUp.sweep();
  }
}
