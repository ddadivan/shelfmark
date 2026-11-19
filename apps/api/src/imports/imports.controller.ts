import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
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
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { ApiErrorResponseDto } from '../common/errors/dto/api-error-response.dto';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { FinishImportDto } from './dto/finish-import.dto';
import { ImportCheckDto } from './dto/import-check.dto';
import { ImportCheckResponseDto } from './dto/import-check-response.dto';
import { ImportLinksDto } from './dto/import-links.dto';
import { ImportLinksResponseDto } from './dto/import-links-response.dto';
import { ListImportsResponseDto } from './dto/list-imports-response.dto';
import { StartImportDto } from './dto/start-import.dto';
import { StartImportResponseDto } from './dto/start-import-response.dto';
import { UndoImportResponseDto } from './dto/undo-import-response.dto';
import { ImportsService } from './imports.service';

@ApiTags('imports')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto, description: 'No valid session' })
@Controller('imports')
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Get()
  @ApiOperation({
    summary: 'Recent imports of the last 7 days that were not undone (newest first)',
  })
  @ApiOkResponse({ type: ListImportsResponseDto })
  list(@CurrentUser() user: AuthUser): Promise<ListImportsResponseDto> {
    return this.imports.list(user.id);
  }

  // Declared before the `:id` routes so `check` is never read as an id.
  @Post('check')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RATE_LIMIT.ImportCheck)
  @ApiOperation({ summary: 'Which of these URLs are already among your live links (read-only)' })
  @ApiOkResponse({ type: ImportCheckResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Invalid body' })
  check(
    @CurrentUser() user: AuthUser,
    @Body() body: ImportCheckDto,
  ): Promise<ImportCheckResponseDto> {
    return this.imports.check(user.id, body.urls);
  }

  @Post()
  @RateLimit(RATE_LIMIT.ImportStart)
  @ApiOperation({
    summary: 'Start an import: records it and creates its folders in one transaction',
  })
  @ApiCreatedResponse({ type: StartImportResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Invalid body or folder keys' })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'Unknown or foreign target folder',
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'The folders do not fit the limit',
  })
  start(
    @CurrentUser() user: AuthUser,
    @Body() body: StartImportDto,
  ): Promise<StartImportResponseDto> {
    return this.imports.start(user.id, body);
  }

  @Post(':id/links')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RATE_LIMIT.ImportBatch)
  @ApiOperation({
    summary: 'Save one batch of links of the import (up to 100); counts, not the links',
  })
  @ApiOkResponse({ type: ImportLinksResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Invalid body' })
  @ApiNotFoundResponse({
    type: ApiErrorResponseDto,
    description: 'Unknown or foreign import or folder',
  })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description:
      'The import is closed (undone or older than 24 hours) or the links do not fit the limit',
  })
  addLinks(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ImportLinksDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<ImportLinksResponseDto> {
    return this.imports.addLinks(user.id, id, body, user.isDemo, { acceptLanguage });
  }

  @Post(':id/finish')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit(RATE_LIMIT.ImportStart)
  @ApiOperation({ summary: 'Store the skipped and failed counts of the client' })
  @ApiNoContentResponse({ description: 'Stored' })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Invalid body' })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto, description: 'Unknown or foreign import' })
  async finish(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: FinishImportDto,
  ): Promise<void> {
    await this.imports.finish(user.id, id, body);
  }

  @Post(':id/undo')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RATE_LIMIT.ImportUndo)
  @ApiOperation({
    summary: 'Undo the import: what it created goes to Trash (7 days, once)',
  })
  @ApiOkResponse({ type: UndoImportResponseDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto, description: 'Unknown or foreign import' })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'Already undone or older than 7 days',
  })
  undo(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UndoImportResponseDto> {
    return this.imports.undo(user.id, id);
  }
}
