import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
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
import { LinkPreviewRequestDto } from './dto/link-preview-request.dto';
import { LinkPreviewResponseDto } from './dto/link-preview-response.dto';
import { LinkResponseDto } from './dto/link-response.dto';
import { ListLinksQueryDto } from './dto/list-links-query.dto';
import { ListLinksResponseDto } from './dto/list-links-response.dto';
import { RecentLinksQueryDto } from './dto/recent-links-query.dto';
import { RecentLinksResponseDto } from './dto/recent-links-response.dto';
import { LinksService } from './links.service';

@ApiTags('links')
@Controller('links')
export class LinksController {
  constructor(private readonly links: LinksService) {}

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RATE_LIMIT.Preview)
  @ApiOkResponse({ type: LinkPreviewResponseDto })
  @ApiBadRequestResponse({ description: 'Not an http(s) URL' })
  @ApiOperation({
    summary: 'Title, icon and image of a URL plus the existing link when it is a duplicate',
    description:
      'An unreachable or unsuitable page is not an error: the answer is 200 with fetched=false and the URL as title.',
  })
  preview(
    @CurrentUser() user: AuthUser,
    @Body() body: LinkPreviewRequestDto,
  ): Promise<LinkPreviewResponseDto> {
    return this.links.preview(user.id, body.url);
  }

  @Get()
  @ApiOkResponse({ type: ListLinksResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid filter, cursor or limit' })
  @ApiOperation({ summary: 'List links with filters, search and cursor paging' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListLinksQueryDto,
  ): Promise<ListLinksResponseDto> {
    return this.links.list(user.id, query);
  }

  // Declared before `:id`, so "recent" is never read as an id.
  @Get('recent')
  @ApiOkResponse({ type: RecentLinksResponseDto })
  @ApiOperation({ summary: 'Recently opened links, newest open first' })
  recent(
    @CurrentUser() user: AuthUser,
    @Query() query: RecentLinksQueryDto,
  ): Promise<RecentLinksResponseDto> {
    return this.links.recent(user.id, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: LinkResponseDto })
  @ApiNotFoundResponse({ description: 'Unknown or foreign link' })
  @ApiOperation({ summary: 'One link; foreign or missing is 404' })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<LinkResponseDto> {
    return this.links.get(user.id, id);
  }
}
