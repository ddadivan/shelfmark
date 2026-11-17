import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
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
import { TidyApplyResponseDto } from './dto/tidy-apply-response.dto';
import { TidyApplyDto } from './dto/tidy-apply.dto';
import { TidyCountResponseDto } from './dto/tidy-count-response.dto';
import { TidyListQueryDto } from './dto/tidy-list-query.dto';
import { TidyListResponseDto } from './dto/tidy-list-response.dto';
import { TidyUndoResponseDto } from './dto/tidy-undo-response.dto';
import { TidyUndoDto } from './dto/tidy-undo.dto';
import { AiTidyUndoService } from './tidy/ai-tidy-undo.service';
import { AiTidyService } from './tidy/ai-tidy.service';

/** Tidy Unsorted under `/api/ai/tidy` (AI-2, #390). Thin: the services own the rules. */
@ApiTags('ai')
@Controller('ai/tidy')
export class AiTidyController {
  constructor(
    private readonly tidy: AiTidyService,
    private readonly tidyUndo: AiTidyUndoService,
  ) {}

  @Get()
  @RateLimit(RATE_LIMIT.AiTidyRead)
  @ApiOkResponse({ type: TidyListResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid query' })
  @ApiOperation({
    summary: 'Links in Unsorted with suggestions to review',
    description:
      'Newest first, one page (after the given link of the previous page); only suggestions still worth showing (a rule decides the folder over AI). Empty while AI is off.',
  })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: TidyListQueryDto,
  ): Promise<TidyListResponseDto> {
    return this.tidy.list(user.id, query.after);
  }

  @Get('count')
  @RateLimit(RATE_LIMIT.AiTidyRead)
  @ApiOkResponse({ type: TidyCountResponseDto })
  @ApiOperation({ summary: 'How many links Tidy would list' })
  count(@CurrentUser() user: AuthUser): Promise<TidyCountResponseDto> {
    return this.tidy.count(user.id);
  }

  @Post('apply')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RATE_LIMIT.AiTidy)
  @ApiOkResponse({ type: TidyApplyResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiConflictResponse({ description: 'AI is off, or a folder or tag changed meanwhile' })
  @ApiOperation({
    summary: 'Apply the selected suggestions of one run',
    description:
      'One transaction. Never replaces a folder the user chose meanwhile; tags past the per-link limit are skipped. Answers the exact undo payload.',
  })
  apply(@CurrentUser() user: AuthUser, @Body() body: TidyApplyDto): Promise<TidyApplyResponseDto> {
    return this.tidy.apply(user.id, body);
  }

  @Post('undo')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RATE_LIMIT.AiTidy)
  @ApiOkResponse({ type: TidyUndoResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiOperation({
    summary: 'Undo a Tidy run',
    description:
      'Reverts only what the run changed and is still there; the suggestions are open again. Works with AI off.',
  })
  undo(@CurrentUser() user: AuthUser, @Body() body: TidyUndoDto): Promise<TidyUndoResponseDto> {
    return this.tidyUndo.undo(user.id, body);
  }
}
