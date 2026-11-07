import { Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AllowAnonymous } from '../common/auth/allow-anonymous.decorator';
import { MonitoringConfigResponseDto } from './dto/monitoring-config-response.dto';
import { MAX_ENVELOPE_BYTES } from './models/max-envelope-bytes.const';
import { MonitoringService } from './monitoring.service';
import { readLimitedBody } from './read-limited-body';

@ApiTags('monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoring: MonitoringService) {}

  // Anonymous on purpose: the web app reads it before any sign-in. It carries the public
  // DSN (a send-only client key), the environment name and the release, nothing else.
  @AllowAnonymous()
  @Get('config')
  @ApiOkResponse({ type: MonitoringConfigResponseDto })
  config(@Res({ passthrough: true }) res: Response): MonitoringConfigResponseDto {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return this.monitoring.getConfig();
  }

  // Anonymous on purpose: errors can happen before or without a session. The route only
  // forwards envelopes that name our own DSN, with a size limit, and never forwards cookies.
  // Rate limiting arrives with the throttler (issue #123).
  @AllowAnonymous()
  @Post('tunnel')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Envelope forwarded to Sentry.' })
  async tunnel(@Req() req: Request): Promise<void> {
    await this.monitoring.forward(await readLimitedBody(req, MAX_ENVELOPE_BYTES));
  }
}
