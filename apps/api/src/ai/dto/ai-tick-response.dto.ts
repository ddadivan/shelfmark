import { ApiProperty } from '@nestjs/swagger';
import { CLEANUP_STATE, type AiTickResponse, type CleanupState } from '@shelfmark/contracts';
import { AiBackfillStatusDto } from './ai-backfill-status.dto';
import { AiSearchStatusDto } from './ai-search-status.dto';

export class AiTickResponseDto implements AiTickResponse {
  @ApiProperty({ minimum: 0 }) pendingJobs!: number;
  @ApiProperty({ type: AiBackfillStatusDto }) backfill!: AiBackfillStatusDto;
  @ApiProperty({ type: AiSearchStatusDto }) search!: AiSearchStatusDto;
  @ApiProperty({ enum: Object.values(CLEANUP_STATE) }) cleanup!: CleanupState;
}
