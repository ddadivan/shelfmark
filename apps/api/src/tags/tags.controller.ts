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
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { CreateTagDto } from './dto/create-tag.dto';
import { ListTagsResponseDto } from './dto/list-tags-response.dto';
import { MergeTagDto } from './dto/merge-tag.dto';
import { TagResponseDto } from './dto/tag-response.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { TagsService } from './tags.service';

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  @Get()
  @ApiOkResponse({ type: ListTagsResponseDto })
  list(@CurrentUser() user: AuthUser): Promise<ListTagsResponseDto> {
    return this.tags.list(user.id);
  }

  @Get(':id')
  @ApiOkResponse({ type: TagResponseDto })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TagResponseDto> {
    return this.tags.get(user.id, id);
  }

  @Post()
  @ApiCreatedResponse({ type: TagResponseDto })
  @ApiConflictResponse({
    description: 'The name exists (case-insensitively) or the tag limit is reached',
  })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateTagDto): Promise<TagResponseDto> {
    return this.tags.create(user.id, body.name);
  }

  @Patch(':id')
  @ApiOkResponse({ type: TagResponseDto })
  @ApiConflictResponse({ description: 'Another tag has this name (case-insensitively)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateTagDto,
  ): Promise<TagResponseDto> {
    return this.tags.rename(user.id, id, body.name);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'The tag is deleted; its links stay' })
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.tags.remove(user.id, id);
  }

  @Post(':id/merge')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TagResponseDto, description: 'The surviving target tag' })
  merge(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: MergeTagDto,
  ): Promise<TagResponseDto> {
    return this.tags.merge(user.id, id, body.targetTagId);
  }
}
