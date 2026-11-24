import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AllowAnonymous } from '../common/auth/allow-anonymous.decorator';
import { CronSecretGuard } from '../demo/cron-secret.guard';
import { CRON_ROUTE } from '../demo/models/cron-route.const';
import { AccountPurgeService } from './account-purge.service';
import { AccountPurgeResponseDto } from './dto/account-purge-response.dto';

@ApiTags('cron')
@Controller(CRON_ROUTE.Controller)
export class AccountPurgeCronController {
  constructor(private readonly purge: AccountPurgeService) {}

  // A state-changing GET like the other cron routes (ADR 0034): Vercel Cron can only send GET.
  // Public to the session guard because there is no user; `CronSecretGuard` (method level)
  // requires the bearer secret and fails closed.
  @Get(CRON_ROUTE.AccountPurge)
  @AllowAnonymous()
  @UseGuards(CronSecretGuard)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Delete accounts whose deletion grace period is over (Vercel Cron)' })
  @ApiOkResponse({ type: AccountPurgeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or wrong CRON_SECRET bearer token' })
  run(): Promise<AccountPurgeResponseDto> {
    return this.purge.run();
  }
}
