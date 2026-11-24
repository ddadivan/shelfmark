import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { ReaderArticleResponseDto } from './dto/reader-article-response.dto';
import { ReaderArticleService } from './reader-article.service';

/** `READER_ENDPOINT.Article`. Thin. */
@ApiTags('reader')
@Controller('links/:id/reader')
export class ReaderArticleController {
  constructor(private readonly articles: ReaderArticleService) {}

  @Get()
  @RateLimit(RATE_LIMIT.ReaderArticle)
  @ApiOkResponse({ type: ReaderArticleResponseDto })
  @ApiNotFoundResponse({ description: 'Unknown, trashed or foreign link' })
  @ApiBadRequestResponse({ description: 'Invalid id' })
  @ApiOperation({
    summary: 'Reader text of a link',
    description:
      "The readable article of the link's page as typed text blocks (never HTML). Stored per link after the first read; fetched through the SSRF-safe fetcher otherwise. `article: null` when the page has none, could not be read, or Fetch previews is off.",
  })
  article(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReaderArticleResponseDto> {
    return this.articles.article(user.id, id);
  }
}
