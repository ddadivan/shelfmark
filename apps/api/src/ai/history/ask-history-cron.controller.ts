import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AllowAnonymous } from '../../common/auth/allow-anonymous.decorator';
import { CronSecretGuard } from '../../demo/cron-secret.guard';
import { CRON_ROUTE } from '../../demo/models/cron-route.const';
import { AskHistoryPurgeResponseDto } from '../dto/ask-history-purge-response.dto';
import { AskHistoryPurgeService } from './ask-history-purge.service';

@ApiTags('cron')
@Controller(CRON_ROUTE.Controller)
export class AskHistoryCronController {
  constructor(private readonly purge: AskHistoryPurgeService) {}

  // A state-changing GET like the other cron routes (ADR 0034): Vercel Cron can only send GET.
  // Public to the session guard because there is no user; `CronSecretGuard` (method level)
  // requires the bearer secret and fails closed.
  @Get(CRON_ROUTE.AskHistoryPurge)
  @AllowAnonymous()
  @UseGuards(CronSecretGuard)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Delete Ask conversations whose last turn is older than 30 days (Vercel Cron)',
  })
  @ApiOkResponse({ type: AskHistoryPurgeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or wrong CRON_SECRET bearer token' })
  run(): Promise<AskHistoryPurgeResponseDto> {
    return this.purge.run();
  }
}
