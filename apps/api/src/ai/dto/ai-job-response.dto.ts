import { ApiProperty } from '@nestjs/swagger';
import {
  AI_JOB_REASON,
  AI_JOB_STATUS,
  type AiJobReason,
  type AiJobResponse,
  type AiJobStatus,
} from '@shelfmark/contracts';
import { LinkSuggestionDto } from './link-suggestion.dto';

export class AiJobResponseDto implements AiJobResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: Object.values(AI_JOB_STATUS) }) status!: AiJobStatus;
  @ApiProperty({ enum: Object.values(AI_JOB_REASON), nullable: true, type: String })
  reason!: AiJobReason | null;
  @ApiProperty({ type: [LinkSuggestionDto] }) suggestions!: LinkSuggestionDto[];
  @ApiProperty({ nullable: true, type: String }) summary!: string | null;
}
