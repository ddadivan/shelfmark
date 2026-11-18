import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { RediscoverResponseDto } from './dto/rediscover-response.dto';
import { RediscoverService } from './rediscover.service';

/** "From your shelf" (F8, `REDISCOVER_ENDPOINT`). Thin: `RediscoverService` owns the rules. */
@ApiTags('rediscover')
@Controller('rediscover')
export class RediscoverController {
  constructor(private readonly rediscover: RediscoverService) {}

  @Get()
  @ApiOkResponse({ type: RediscoverResponseDto })
  @ApiOperation({
    summary: "This week's From your shelf block",
    description:
      'Older links of the user not opened for a while: by theme (AI on, AI pack, search ready) or in a weekly order. Empty items = no block (dismissed this week or too few candidates). No model call.',
  })
  block(@CurrentUser() user: AuthUser): Promise<RediscoverResponseDto> {
    return this.rediscover.block(user);
  }

  @Post('dismiss')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit(RATE_LIMIT.RediscoverWrite)
  @ApiNoContentResponse({ description: 'Hidden until next week' })
  @ApiOperation({ summary: 'Dismiss the block for this week' })
  async dismiss(@CurrentUser() user: AuthUser): Promise<void> {
    await this.rediscover.dismiss(user.id);
  }

  @Post('links/:id/hide')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit(RATE_LIMIT.RediscoverWrite)
  @ApiNoContentResponse({ description: 'The link never shows in the block again (idempotent)' })
  @ApiNotFoundResponse({ description: 'Not a live link of the user' })
  @ApiOperation({ summary: 'Not interested' })
  async hide(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    await this.rediscover.hide(user.id, id);
  }
}
