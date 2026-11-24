import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { RATE_LIMIT } from '../../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator';
import { AskConversationListQueryDto } from '../dto/ask-conversation-list-query.dto';
import { AskConversationListResponseDto } from '../dto/ask-conversation-list-response.dto';
import { AskConversationResponseDto } from '../dto/ask-conversation-response.dto';
import { AskConversationsDeletedResponseDto } from '../dto/ask-conversations-deleted-response.dto';
import { AskHistoryService } from './ask-history.service';

/**
 * Ask history (ADR 0055 amendment, 2026-11-24): the session user's stored conversations. Turns are
 * written by `POST /api/ai/ask` only; there is no route that stores a client-sent answer.
 */
@ApiTags('ai')
@Controller('ai/ask/conversations')
export class AskHistoryController {
  constructor(private readonly history: AskHistoryService) {}

  @Get()
  @RateLimit(RATE_LIMIT.AskHistoryRead)
  @ApiOperation({ summary: 'Your stored Ask conversations, newest first (paged)' })
  @ApiOkResponse({ type: AskConversationListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid cursor or limit' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: AskConversationListQueryDto,
  ): Promise<AskConversationListResponseDto> {
    return this.history.list(user.id, query.limit, query.cursor);
  }

  @Delete()
  @RateLimit(RATE_LIMIT.AskHistoryWrite)
  @ApiOperation({ summary: 'Clear all: deletes every stored Ask conversation' })
  @ApiOkResponse({ type: AskConversationsDeletedResponseDto })
  clear(@CurrentUser() user: AuthUser): Promise<AskConversationsDeletedResponseDto> {
    return this.history.clear(user.id);
  }

  @Get(':id')
  @RateLimit(RATE_LIMIT.AskHistoryRead)
  @ApiOperation({ summary: 'One stored Ask conversation with its turns (links re-read live)' })
  @ApiOkResponse({ type: AskConversationResponseDto })
  @ApiNotFoundResponse({ description: 'Not a conversation of yours' })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AskConversationResponseDto> {
    return this.history.get(user.id, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit(RATE_LIMIT.AskHistoryWrite)
  @ApiOperation({ summary: 'Deletes one stored Ask conversation' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Not a conversation of yours' })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.history.remove(user.id, id);
  }
}
