import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
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
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { ReaderProgressRequestDto } from './dto/reader-progress-request.dto';
import { ReaderProgressResponseDto } from './dto/reader-progress-response.dto';
import { ReaderProgressDto } from './dto/reader-progress.dto';
import { ReaderProgressService } from './reader-progress.service';

/** `READER_ENDPOINT.Progress` and `LinkProgress`. Thin. */
@ApiTags('reader')
@Controller('reader/progress')
export class ReaderProgressController {
  constructor(private readonly progress: ReaderProgressService) {}

  @Get()
  @ApiOkResponse({ type: [ReaderProgressDto] })
  @ApiOperation({
    summary: 'Continue reading',
    description:
      'Links started in Reader and not finished (5 % to 95 %), live links only, the most recent first, at most five.',
  })
  list(@CurrentUser() user: AuthUser): Promise<ReaderProgressDto[]> {
    return this.progress.list(user.id);
  }

  @Get(':linkId')
  @ApiOkResponse({ type: ReaderProgressResponseDto })
  @ApiNotFoundResponse({ description: 'Unknown, trashed or foreign link' })
  @ApiBadRequestResponse({ description: 'Invalid id' })
  @ApiOperation({
    summary: 'Reading progress of one link',
    description: '`progress: null` when none is stored.',
  })
  get(
    @CurrentUser() user: AuthUser,
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ): Promise<ReaderProgressResponseDto> {
    return this.progress.get(user.id, linkId);
  }

  @Put(':linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit(RATE_LIMIT.ReaderProgressWrite)
  @ApiNoContentResponse({ description: 'Stored' })
  @ApiNotFoundResponse({ description: 'Unknown, trashed or foreign link' })
  @ApiBadRequestResponse({ description: 'Invalid id, fraction or minutes left' })
  @ApiOperation({
    summary: 'Store reading progress',
    description:
      'The last scroll position (share read) and the minutes left; the server stamps the time.',
  })
  save(
    @CurrentUser() user: AuthUser,
    @Param('linkId', ParseUUIDPipe) linkId: string,
    @Body() body: ReaderProgressRequestDto,
  ): Promise<void> {
    return this.progress.save(user.id, linkId, body);
  }
}
