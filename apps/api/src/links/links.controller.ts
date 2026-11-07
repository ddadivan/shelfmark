import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../common/auth/current-user.decorator';
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
