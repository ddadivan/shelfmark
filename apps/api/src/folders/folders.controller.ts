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
  Query,
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
import { CreateFolderDto } from './dto/create-folder.dto';
import { DeleteFolderQueryDto } from './dto/delete-folder-query.dto';
import { FolderResponseDto } from './dto/folder-response.dto';
import { ListFoldersResponseDto } from './dto/list-folders-response.dto';
import { ReorderFoldersDto } from './dto/reorder-folders.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { FoldersService } from './folders.service';

@ApiTags('folders')
@Controller('folders')
export class FoldersController {
  constructor(private readonly folders: FoldersService) {}

  @Get()
  @ApiOkResponse({ type: ListFoldersResponseDto })
  @ApiOperation({
    summary: 'All folders (flat, by position then name) with direct link counts and library counts',
  })
  list(@CurrentUser() user: AuthUser): Promise<ListFoldersResponseDto> {
    return this.folders.list(user.id);
  }

  // Declared before `:id`; a different method, kept here for readability.
  @Put('order')
  @ApiOkResponse({ type: ListFoldersResponseDto, description: 'All folders afterwards' })
  @ApiBadRequestResponse({ description: 'The list is not exactly the subfolders of that parent' })
  @ApiNotFoundResponse({ description: 'Unknown, foreign or trashed parent' })
  @ApiOperation({ summary: 'Reorder the subfolders of one parent (null = top level)' })
  reorder(
    @CurrentUser() user: AuthUser,
    @Body() body: ReorderFoldersDto,
  ): Promise<ListFoldersResponseDto> {
    return this.folders.reorder(user.id, body.parentId, body.ids);
  }

  @Get(':id')
  @ApiOkResponse({ type: FolderResponseDto })
  @ApiNotFoundResponse({ description: 'Unknown or foreign folder' })
  @ApiOperation({ summary: 'One folder; foreign or missing is 404' })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FolderResponseDto> {
    return this.folders.get(user.id, id);
  }

  @Post()
  @ApiCreatedResponse({ type: FolderResponseDto })
  @ApiNotFoundResponse({ description: 'Unknown or foreign parent' })
  @ApiConflictResponse({ description: 'The folder limit is reached' })
  @ApiOperation({ summary: 'Create a folder; 404 for a foreign parent, 409 at the per-user cap' })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateFolderDto): Promise<FolderResponseDto> {
    return this.folders.create(user.id, body);
  }

  @Patch(':id')
  @ApiOkResponse({ type: FolderResponseDto })
  @ApiNotFoundResponse({ description: 'Unknown or foreign folder or parent' })
  @ApiBadRequestResponse({ description: 'Invalid body, or a move into itself or a subfolder' })
  @ApiOperation({ summary: 'Rename and/or move; 400 when moving into itself or a descendant' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateFolderDto,
  ): Promise<FolderResponseDto> {
    return this.folders.update(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ description: 'Unknown or foreign folder' })
  @ApiBadRequestResponse({ description: 'Missing or invalid mode' })
  @ApiOperation({ summary: 'Delete a folder with its subfolders; mode decides the links' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DeleteFolderQueryDto,
  ): Promise<void> {
    await this.folders.remove(user.id, id, query.mode);
  }
}
