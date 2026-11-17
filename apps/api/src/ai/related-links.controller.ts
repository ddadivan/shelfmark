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
import { RelatedLinksQueryDto } from './dto/related-links-query.dto';
import { RelatedLinksResponseDto } from './dto/related-links-response.dto';
import { RelatedLinksService } from './search/related-links.service';

/** `AI_ENDPOINT.RelatedLinks` (AI-3, F7). Thin. */
@ApiTags('ai')
@Controller('links/:id/related')
export class RelatedLinksController {
  constructor(private readonly relatedLinks: RelatedLinksService) {}

  @Get()
  @ApiOkResponse({ type: RelatedLinksResponseDto })
  @ApiNotFoundResponse({ description: 'Unknown, trashed or foreign link' })
  @ApiBadRequestResponse({ description: 'Invalid id or limit' })
  @ApiOperation({
    summary: 'Related links',
    description:
      "Up to five of the user's other live links closest to this link by its stored vector (no model call), with why they are related.",
  })
  related(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: RelatedLinksQueryDto,
  ): Promise<RelatedLinksResponseDto> {
    return this.relatedLinks.related(user, id, query.limit);
  }
}
