import { ApiProperty } from '@nestjs/swagger';
import {
  FEEDBACK_MILESTONE,
  type FeedbackMilestone,
  type RecordRatingPromptViewRequest,
} from '@shelfmark/contracts';
import { IsIn } from 'class-validator';

export class RecordRatingPromptViewDto implements RecordRatingPromptViewRequest {
  @ApiProperty({ enum: Object.values(FEEDBACK_MILESTONE) })
  @IsIn(Object.values(FEEDBACK_MILESTONE))
  milestone!: FeedbackMilestone;
}
