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
import { ImportGroupsDto } from './dto/import-groups.dto';
import { ImportGroupsResponseDto } from './dto/import-groups-response.dto';
import { ImportLinksDto } from './dto/import-links.dto';
import { ImportLinksResponseDto } from './dto/import-links-response.dto';
import { ImportSummaryDto } from './dto/import-summary.dto';
import { ListImportsResponseDto } from './dto/list-imports-response.dto';
import { StartImportDto } from './dto/start-import.dto';
import { StartImportResponseDto } from './dto/start-import-response.dto';
import { UndoImportResponseDto } from './dto/undo-import-response.dto';
import { ImportGroupsService } from './import-groups.service';
import { ImportsService } from './imports.service';

@ApiTags('imports')
@ApiUnauthorizedResponse({ type: ApiErrorResponseDto, description: 'No valid session' })
@Controller('imports')
export class ImportsController {
  constructor(
    private readonly imports: ImportsService,
    private readonly groups: ImportGroupsService,
  ) {}

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
    return this.imports.check(user.id, body.urls, user.isDemo);
  }

  @Post('groups')
  @HttpCode(HttpStatus.OK)
  @RateLimit(RATE_LIMIT.ImportGroups)
  @ApiOperation({
    summary: 'AI groups by topic for the links of a file (nothing is written)',
    description:
      'Takes one unit of the allowance for existing links per link (all or nothing; units of an earlier grouping nobody used are given back first), embeds and clusters the titles, names the groups in your language and matches them to your folders by name. A provider failure answers 503 and gives the units back. The body limit of this route is 1 MB.',
  })
  @ApiOkResponse({ type: ImportGroupsResponseDto })
  @ApiBadRequestResponse({ type: ApiErrorResponseDto, description: 'Invalid body' })
  @ApiConflictResponse({
    type: ApiErrorResponseDto,
    description: 'AI is off or not in your plan, or not enough of the allowance is left',
  })
  group(
    @CurrentUser() user: AuthUser,
    @Body() body: ImportGroupsDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<ImportGroupsResponseDto> {
    return this.groups.group(user, body, { acceptLanguage });
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

  @Get(':id')
  @ApiOperation({ summary: 'One of your imports with its AI pass (polled while it runs)' })
  @ApiOkResponse({ type: ImportSummaryDto })
  @ApiNotFoundResponse({ type: ApiErrorResponseDto, description: 'Unknown or foreign import' })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ImportSummaryDto> {
    return this.imports.get(user.id, id);
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
