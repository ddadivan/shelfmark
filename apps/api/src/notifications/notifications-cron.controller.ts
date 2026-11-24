import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AllowAnonymous } from '../common/auth/allow-anonymous.decorator';
import { CronSecretGuard } from '../demo/cron-secret.guard';
import { CRON_ROUTE } from '../demo/models/cron-route.const';
import { NotificationDeliveryResponseDto } from './dto/notification-delivery-response.dto';
import { NotificationDeliveryService } from './notification-delivery.service';

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
  run(): Promise<NotificationDeliveryResponseDto> {
    return this.delivery.run();
  }
}
