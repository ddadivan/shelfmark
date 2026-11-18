import { ApiProperty } from '@nestjs/swagger';
import {
  AI_PROVIDER_STATUS,
  type AiProviderStatus,
  type AiSettingsResponse,
} from '@shelfmark/contracts';
import { AiBackfillStatusDto } from './ai-backfill-status.dto';
import { AiEntitlementsDto } from './ai-entitlements.dto';
import { AiSearchStatusDto } from './ai-search-status.dto';
import { AiSettingsDto } from './ai-settings.dto';
import { AiUsageDto } from './ai-usage.dto';
import { AskStatusDto } from './ask-status.dto';

export class AiSettingsResponseDto implements AiSettingsResponse {
  @ApiProperty({ type: AiSettingsDto }) settings!: AiSettingsDto;
  @ApiProperty() introSeen!: boolean;
  @ApiProperty() announcementSeen!: boolean;
  @ApiProperty({ type: AiEntitlementsDto }) entitlements!: AiEntitlementsDto;
  @ApiProperty({ type: AiUsageDto }) usage!: AiUsageDto;
  @ApiProperty({ enum: Object.values(AI_PROVIDER_STATUS) }) providerStatus!: AiProviderStatus;
  @ApiProperty() pendingJobs!: number;
  @ApiProperty({ type: AiBackfillStatusDto }) backfill!: AiBackfillStatusDto;
  @ApiProperty({ type: AiSearchStatusDto }) search!: AiSearchStatusDto;
  @ApiProperty({ type: AskStatusDto }) ask!: AskStatusDto;
}
