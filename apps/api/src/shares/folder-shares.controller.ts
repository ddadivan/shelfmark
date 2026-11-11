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
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { FolderShareResponseDto } from './dto/folder-share-response.dto';
import { UpdateFolderShareDto } from './dto/update-folder-share.dto';
import { FolderSharesService } from './folder-shares.service';

/**
 * The owner's public link of a folder (#276). Session only, the global CSRF guard covers the
 * unsafe methods; a foreign or missing folder is 404 like everywhere else.
 */
@ApiTags('shares')
@Controller('folders/:id/share')
export class FolderSharesController {
  constructor(private readonly shares: FolderSharesService) {}

  @Get()
  @ApiOkResponse({ type: FolderShareResponseDto })
  @ApiNotFoundResponse({ description: 'Unknown or foreign folder' })
  @ApiOperation({ summary: 'The public link of a folder (enabled: false when not shared)' })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FolderShareResponseDto> {
    return this.shares.get(user.id, id);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @RateLimit(RATE_LIMIT.Share)
  @ApiOkResponse({ type: FolderShareResponseDto, description: 'Shared (an existing link is kept)' })
  @ApiNotFoundResponse({ description: 'Unknown or foreign folder' })
  @ApiForbiddenResponse({ description: 'Demo user, or a foreign Origin' })
  @ApiConflictResponse({ description: 'The public folder limit is reached' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  @ApiOperation({ summary: 'Turn the public link on; idempotent' })
  enable(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FolderShareResponseDto> {
    return this.shares.enable(user, id);
  }

  @Patch()
  @ApiOkResponse({ type: FolderShareResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiNotFoundResponse({ description: 'Unknown or foreign folder, or not shared' })
  @ApiOperation({ summary: 'Change the link settings (show notes)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateFolderShareDto,
  ): Promise<FolderShareResponseDto> {
    return this.shares.update(user.id, id, body);
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RATE_LIMIT.Share)
  @ApiOkResponse({ type: FolderShareResponseDto, description: 'The link with its new token' })
  @ApiNotFoundResponse({ description: 'Unknown or foreign folder, or not shared' })
  @ApiTooManyRequestsResponse({ description: 'Rate limit exceeded' })
  @ApiOperation({ summary: 'Replace the token; the old link stops working at once' })
  reset(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FolderShareResponseDto> {
    return this.shares.reset(user.id, id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Not shared any more (idempotent)' })
  @ApiNotFoundResponse({ description: 'Unknown or foreign folder' })
  @ApiOperation({ summary: 'Turn the public link off' })
  async disable(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.shares.disable(user.id, id);
  }
}
