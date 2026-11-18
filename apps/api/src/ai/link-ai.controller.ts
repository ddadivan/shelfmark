import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { LinkResponseDto } from '../links/dto/link-response.dto';
import { LinkAiStateDto } from './dto/link-ai-state.dto';
import { UndoAiApplyDto } from './dto/undo-ai-apply.dto';
import { LinkAiService } from './link-ai/link-ai.service';

/** AI routes of one link (`AI_ENDPOINT.LinkAi*`, under `/api/links/:id/ai`). Thin. */
@ApiTags('ai')
@Controller('links/:id/ai')
export class LinkAiController {
  constructor(private readonly linkAi: LinkAiService) {}

  @Get()
  @ApiOkResponse({ type: LinkAiStateDto })
  @ApiNotFoundResponse({ description: 'Unknown, trashed or foreign link' })
  @ApiOperation({ summary: 'AI state of a link: status, summary, suggestions, auto-applied marks' })
  state(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LinkAiStateDto> {
    return this.linkAi.state(user.id, id);
  }

  @Post('rewrite')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RATE_LIMIT.AiRewrite)
  @ApiOkResponse({ type: LinkAiStateDto })
  @ApiNotFoundResponse({ description: 'Unknown, trashed or foreign link' })
  @ApiConflictResponse({ description: 'AI or summaries are off, or the summary is your own' })
  @ApiOperation({
    summary: 'Ask for a new summary',
    description:
      'Queues a rewrite job (counts against the monthly limit, never auto-applies) and answers the state, usually pending; poll GET /api/links/:id/ai.',
  })
  rewrite(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<LinkAiStateDto> {
    return this.linkAi.rewrite(user.id, id, { acceptLanguage });
  }

  @Post('undo')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RATE_LIMIT.AiWrite)
  @ApiOkResponse({ type: LinkResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid part' })
  @ApiNotFoundResponse({ description: 'Unknown, trashed or foreign link' })
  @ApiOperation({
    summary: 'Undo what Automatic mode applied',
    description:
      'folder: back to Unsorted while the link is still in the folder AI chose; tags: removes the tags AI added that are still on the link.',
  })
  undo(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UndoAiApplyDto,
  ): Promise<LinkResponseDto> {
    return this.linkAi.undo(user.id, id, body.part);
  }
}
