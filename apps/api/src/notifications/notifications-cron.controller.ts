import { Controller, Get, Header, Headers, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AllowAnonymous } from '../common/auth/allow-anonymous.decorator';
import { CronSecretGuard } from '../demo/cron-secret.guard';
import { CRON_ROUTE } from '../demo/models/cron-route.const';
import { NotificationDeliveryResponseDto } from './dto/notification-delivery-response.dto';
import { NotificationDeliveryService } from './notification-delivery.service';

const EXECUTION_ID = /^[A-Za-z0-9_.:-]{1,128}$/;

function safeExecutionId(value: string | undefined): string | undefined {
  return value !== undefined && EXECUTION_ID.test(value) ? value : undefined;
}

@ApiTags('cron')
@Controller(CRON_ROUTE.Controller)
export class NotificationsCronController {
  constructor(private readonly delivery: NotificationDeliveryService) {}

  // A state-changing GET like the other cron routes (ADR 0034): Vercel Cron can only send GET.
  // Public to the session guard because there is no user; `CronSecretGuard` (method level) requires
  // the bearer secret and fails closed.
  @Get(CRON_ROUTE.Notifications)
  @AllowAnonymous()
  @UseGuards(CronSecretGuard)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Push due reminders to devices (Vercel Cron or an external scheduler)' })
  @ApiOkResponse({ type: NotificationDeliveryResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or wrong CRON_SECRET bearer token' })
  run(@Headers('ce-id') executionId?: string): Promise<NotificationDeliveryResponseDto> {
    // `ce-id` is the Vercel Schedule occurrence (the same for every delivery of it): logged only,
    // after the secret check, and only when it has the shape of an id. Idempotency is the claim.
    return this.delivery.run({ executionId: safeExecutionId(executionId) });
  }
}
