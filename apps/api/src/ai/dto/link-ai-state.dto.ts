import { ApiProperty } from '@nestjs/swagger';
import {
  AI_JOB_REASON,
  AI_JOB_STATUS,
  SUMMARY_SOURCE,
  type AiJobReason,
  type AiJobStatus,
  type LinkAiState,
  type SummarySource,
} from '@shelfmark/contracts';
import { AiAutoAppliedDto } from './ai-auto-applied.dto';
import { LinkSuggestionDto } from './link-suggestion.dto';

export class LinkAiStateDto implements LinkAiState {
  @ApiProperty({ enum: Object.values(AI_JOB_STATUS), nullable: true, type: String })
  aiStatus!: AiJobStatus | null;
  @ApiProperty({ enum: Object.values(AI_JOB_REASON), nullable: true, type: String })
  reason!: AiJobReason | null;
  @ApiProperty({ nullable: true, type: String }) summary!: string | null;
  @ApiProperty({ enum: Object.values(SUMMARY_SOURCE), nullable: true, type: String })
  summarySource!: SummarySource | null;
  @ApiProperty({ type: [LinkSuggestionDto] }) suggestions!: LinkSuggestionDto[];
  @ApiProperty({ type: AiAutoAppliedDto, nullable: true }) autoApplied!: AiAutoAppliedDto | null;
}
