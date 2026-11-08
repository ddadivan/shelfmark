import { Body, Controller, Header, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AllowAnonymous } from '../common/auth/allow-anonymous.decorator';
import { clientIp } from '../common/rate-limit/client-ip';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RETRY_AFTER_HEADER } from '../common/rate-limit/models/retry-after-header.const';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { shouldTrustProxyHeaders } from '../common/rate-limit/rate-limit-options';
import { DemoSessionResponseDto } from './dto/demo-session-response.dto';
import { DemoQuotaExceededException } from './demo-quota-exceeded.exception';
import { DemoService } from './demo.service';
import { EmptyBodyPipe } from './empty-body.pipe';

const SET_COOKIE_HEADER = 'Set-Cookie';

@ApiTags('demo')
@Controller('demo')
export class DemoController {
  constructor(private readonly demo: DemoService) {}

  // Public by design (ADR 0034, listed in PUBLIC_ROUTES): this is the sign-in itself. It creates a
  // sandbox user, so it is limited per client IP (throttler, best effort) and in Postgres (the
  // quota and the cap in `DemoService`), and it takes no input.
  @Post()
  @AllowAnonymous()
  @RateLimit(RATE_LIMIT.Demo)
  @HttpCode(HttpStatus.CREATED)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Start a 24 hour demo session with a seeded library' })
  @ApiCreatedResponse({ type: DemoSessionResponseDto, description: 'Session cookie is set' })
  @ApiBadRequestResponse({ description: 'The request has a body' })
  @ApiForbiddenResponse({ description: 'Cross-site request' })
  @ApiTooManyRequestsResponse({ description: 'Too many demo sessions, see Retry-After' })
  @ApiServiceUnavailableResponse({ description: 'All demo sandboxes are in use' })
  async create(
    @Body(EmptyBodyPipe) _body: undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<DemoSessionResponseDto> {
    try {
      const { body, setCookies } = await this.demo.create(clientIp(req, shouldTrustProxyHeaders()));
      for (const cookie of setCookies) res.append(SET_COOKIE_HEADER, cookie);
      return body;
    } catch (error) {
      if (error instanceof DemoQuotaExceededException) {
        res.setHeader(RETRY_AFTER_HEADER, String(error.retryAfterSeconds));
      }
      throw error;
    }
  }
}
