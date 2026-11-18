import { ApiProperty } from '@nestjs/swagger';
import type { AiTickResponse } from '@shelfmark/contracts';
import { AiBackfillStatusDto } from './ai-backfill-status.dto';

export class AiTickResponseDto implements AiTickResponse {
  @ApiProperty({ minimum: 0 }) pendingJobs!: number;
  @ApiProperty({ type: AiBackfillStatusDto }) backfill!: AiBackfillStatusDto;
}
