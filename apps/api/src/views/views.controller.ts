import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
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
import { CreateSavedViewDto } from './dto/create-saved-view.dto';
import { ListSavedViewsResponseDto } from './dto/list-saved-views-response.dto';
import { ReorderSavedViewsDto } from './dto/reorder-saved-views.dto';
import { SavedViewResponseDto } from './dto/saved-view-response.dto';
import { UpdateSavedViewDto } from './dto/update-saved-view.dto';
import { ViewsService } from './views.service';

@ApiTags('views')
@Controller('views')
export class ViewsController {
  constructor(private readonly views: ViewsService) {}

  @Get()
  @ApiOkResponse({ type: ListSavedViewsResponseDto })
  @ApiOperation({ summary: 'Saved views in order, each with its live link count, plus the total' })
  list(@CurrentUser() user: AuthUser): Promise<ListSavedViewsResponseDto> {
    return this.views.list(user.id);
  }

  @Post()
  @RateLimit(RATE_LIMIT.ViewWrite)
  @ApiCreatedResponse({ type: SavedViewResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid name or query' })
  @ApiNotFoundResponse({ description: 'Unknown, foreign or trashed folder' })
  @ApiConflictResponse({ description: 'The view limit is reached' })
  @ApiOperation({ summary: 'Save a filter as a view at the end' })
  create(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateSavedViewDto,
  ): Promise<SavedViewResponseDto> {
    return this.views.create(user.id, body);
  }

  // Declared before `:id`; different method, kept adjacent for readability.
  @Put('order')
  @RateLimit(RATE_LIMIT.ViewWrite)
  @ApiOkResponse({ type: ListSavedViewsResponseDto })
  @ApiBadRequestResponse({ description: 'The list is not exactly the set of views' })
  @ApiOperation({ summary: 'Reorder the views: every view once, in the new order' })
  reorder(
    @CurrentUser() user: AuthUser,
    @Body() body: ReorderSavedViewsDto,
  ): Promise<ListSavedViewsResponseDto> {
    return this.views.reorder(user.id, body.ids);
  }

  @Patch(':id')
  @RateLimit(RATE_LIMIT.ViewWrite)
  @ApiOkResponse({ type: SavedViewResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid name or query' })
  @ApiNotFoundResponse({
    description: 'Unknown or foreign view, or an unknown, foreign or trashed folder',
  })
  @ApiOperation({ summary: 'Rename a view or replace its query' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateSavedViewDto,
  ): Promise<SavedViewResponseDto> {
    return this.views.update(user.id, id, body);
  }

  @Delete(':id')
  @RateLimit(RATE_LIMIT.ViewWrite)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Unknown or foreign view' })
  @ApiOperation({ summary: 'Delete a view (the links stay)' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.views.remove(user.id, id);
  }
}
