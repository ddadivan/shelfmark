import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import type { Response } from 'express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { LongRunning } from '../../common/interceptors/long-running.decorator';
import { RATE_LIMIT } from '../../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator';
import { AskRequestDto } from '../dto/ask-request.dto';
import { AskService } from './ask.service';
import { SseWriter } from './sse-writer';

/** `POST /api/ai/ask` (F4, ADR 0051). Thin: `AskService` owns the rules. */
@ApiTags('ai')
@Controller('ai')
export class AskController {
  constructor(private readonly asks: AskService) {}

  @Post('ask')
  @HttpCode(HttpStatus.OK)
  // Streams for up to ASK_LIMIT.StreamMaxMs with its own deadlines (LONG_RUNNING_ROUTES).
  @LongRunning()
  @RateLimit(RATE_LIMIT.AiAsk)
  @ApiProduces('text/event-stream')
  @ApiOkResponse({
    description:
      'text/event-stream: one JSON AskEvent per `data:` line (meta, text, cite, then done or error). Errors after validation (AI off, busy, quota, provider down) are error events, not HTTP statuses.',
  })
  @ApiBadRequestResponse({ description: 'question missing, under 3 or over 500 characters' })
  @ApiOperation({
    summary: 'Ask your shelf',
    description:
      "A single-turn answer from the session user's own links, streamed, with citations to those links only. Nothing is stored.",
  })
  async ask(
    @CurrentUser() user: AuthUser,
    @Body() body: AskRequestDto,
    @Res() res: Response,
  ): Promise<void> {
    const writer = new SseWriter(res);
    try {
      await this.asks.ask(user, body.question, writer);
    } finally {
      writer.end();
    }
  }
}
