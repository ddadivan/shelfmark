import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '@shelfmark/contracts';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { RATE_LIMIT } from '../common/rate-limit/models/rate-limit.const';
import { RateLimit } from '../common/rate-limit/rate-limit.decorator';
import { AiSettingsResponseDto } from './dto/ai-settings-response.dto';
import { UpdateAiSettingsDto } from './dto/update-ai-settings.dto';
import { AiSettingsService } from './settings/ai-settings.service';

/** AI routes under `/api/ai` (`AI_ENDPOINT`). Thin: the services own the rules. */
@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly settings: AiSettingsService) {}

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
}
