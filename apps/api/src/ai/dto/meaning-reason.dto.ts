import { ApiProperty } from '@nestjs/swagger';
import {
  AI_SEARCH_LIMIT,
  MEANING_REASON_SOURCE,
  type MeaningReason,
  type MeaningReasonSource,
} from '@shelfmark/contracts';

export class MeaningReasonDto implements MeaningReason {
  @ApiProperty({ enum: Object.values(MEANING_REASON_SOURCE) }) source!: MeaningReasonSource;
  @ApiProperty({ maxLength: AI_SEARCH_LIMIT.WhyTextMax, description: 'Plain text' }) text!: string;
}
