import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
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
import { AiJobResponseDto } from './dto/ai-job-response.dto';
import { AiSettingsResponseDto } from './dto/ai-settings-response.dto';
import { CreateAiDraftDto } from './dto/create-ai-draft.dto';
import { AiJobsService } from './jobs/ai-jobs.service';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
import { AiSettingsService } from './settings/ai-settings.service';
import { AiDataService } from './data/ai-data.service';
import { AiSuggestionsService } from './suggestions/ai-suggestions.service';

/** AI routes under `/api/ai` (`AI_ENDPOINT`). Thin: the services own the rules. */
@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(
    private readonly settings: AiSettingsService,
    private readonly jobs: AiJobsService,
    private readonly suggestions: AiSuggestionsService,
    private readonly data: AiDataService,
  ) {}

  @Get('settings')
  @ApiOkResponse({ type: AiSettingsResponseDto })
  @ApiOperation({
    summary: 'AI settings with usage, entitlements, provider status, pending jobs and backfill',
  })
  getSettings(@CurrentUser() user: AuthUser): Promise<AiSettingsResponseDto> {
    return this.settings.get(user.id);
  }

  @Patch('settings')
  @RateLimit(RATE_LIMIT.AiWrite)
  @ApiOkResponse({ type: AiSettingsResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid value, unknown field or no field at all' })
  @ApiOperation({
    summary: 'Change AI settings',
    description:
      'The first enabled=true records the intro as seen; enabled=false skips queued jobs, stops a running backfill and cancels open batches.',
  })
  updateSettings(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateAiSettingsDto,
  ): Promise<AiSettingsResponseDto> {
    return this.settings.update(user.id, body);
  }

  @Post('drafts')
  @HttpCode(HttpStatus.ACCEPTED)
  @RateLimit(RATE_LIMIT.AiDraft)
  @ApiAcceptedResponse({ type: AiJobResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiOperation({
    summary: 'Start (or return) the draft job of an Add link dialog',
    description:
      'Runs after the response; poll GET /api/ai/jobs/:id. skipped with reason off or quota when AI is off, asks for nothing or the monthly limit is reached.',
  })
  createDraft(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateAiDraftDto,
    @Headers('accept-language') acceptLanguage?: string,
  ): Promise<AiJobResponseDto> {
    return this.jobs.createDraft(user, body, { acceptLanguage });
  }

  @Get('jobs/:id')
  @ApiOkResponse({ type: AiJobResponseDto })
  @ApiNotFoundResponse({ description: 'Unknown or foreign job' })
  @ApiOperation({ summary: 'A job and its result so far (running reads as pending)' })
  getJob(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AiJobResponseDto> {
    return this.jobs.getJob(user.id, id);
  }

  @Post('suggestions/:id/dismiss')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit(RATE_LIMIT.AiWrite)
  @ApiNoContentResponse({ description: 'Dismissed (or already decided)' })
  @ApiNotFoundResponse({ description: 'Unknown or foreign suggestion' })
  @ApiOperation({ summary: 'Hide a suggestion for its link for good' })
  async dismissSuggestion(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.suggestions.dismiss(user.id, id);
  }

  @Delete('data')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit(RATE_LIMIT.AiDeleteData)
  @ApiNoContentResponse({ description: 'AI summaries, suggestions and jobs deleted' })
  @ApiOperation({
    summary: 'Delete what AI generated',
    description:
      'Removes AI summaries, all suggestions and jobs, cancels open batches and a running backfill. Your own summaries, tags, folders, settings and usage counts stay.',
  })
  async deleteData(@CurrentUser() user: AuthUser): Promise<void> {
    await this.data.deleteAll(user.id);
  }
}
