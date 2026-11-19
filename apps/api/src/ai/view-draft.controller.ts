import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { ViewDraftRequestDto } from './dto/view-draft-request.dto';
import { ViewDraftResponseDto } from './dto/view-draft-response.dto';
import { ViewDraftService } from './view-draft/view-draft.service';

/** `POST /api/ai/view-draft` (#535, ADR 0057). Thin: `ViewDraftService` owns the rules. */
@ApiTags('ai')
@Controller('ai')
export class ViewDraftController {
  constructor(private readonly drafts: ViewDraftService) {}

  @Post('view-draft')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RATE_LIMIT.AiViewDraft)
  @ApiOkResponse({ type: ViewDraftResponseDto })
  @ApiBadRequestResponse({ description: 'phrase missing, under 3 or over 200 characters' })
  @ApiConflictResponse({ description: 'AI is off' })
  @ApiOperation({
    summary: 'A saved view filter from a phrase',
    description:
      "One short model call over the phrase and the session user's own folder and tag names; the answer uses only those (unknown names become search words). Counts one Ask question; refunded when the model fails. Nothing is stored.",
  })
  draft(
    @CurrentUser() user: AuthUser,
    @Body() body: ViewDraftRequestDto,
  ): Promise<ViewDraftResponseDto> {
    return this.drafts.draft(user, body.phrase);
  }
}
