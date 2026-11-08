import { ApiProperty } from '@nestjs/swagger';
import {
  FEEDBACK_MILESTONE,
  type FeedbackMilestone,
  type FeedbackPromptResponse,
} from '@shelfmark/contracts';

export class FeedbackPromptResponseDto implements FeedbackPromptResponse {
  @ApiProperty({
    enum: Object.values(FEEDBACK_MILESTONE),
    nullable: true,
    type: String,
    description: 'The milestone to ask about now; null for nothing due, demo or onboarding pending',
  })
  milestone!: FeedbackMilestone | null;
}
