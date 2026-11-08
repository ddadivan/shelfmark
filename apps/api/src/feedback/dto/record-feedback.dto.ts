import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FEEDBACK_LIMIT,
  FEEDBACK_MILESTONE,
  type FeedbackMilestone,
  type FeedbackScore,
  type RecordFeedbackRequest,
} from '@shelfmark/contracts';
import { Transform } from 'class-transformer';
import { IsIn, IsString, MaxLength, ValidateIf } from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';
import { IsFeedbackScore } from './feedback-score.decorator';
import { NoCommentWithoutScore } from './no-comment-without-score.decorator';

/** Trims the comment; an empty result counts as absent. */
const TrimToAbsent = (): PropertyDecorator =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  });

export class RecordFeedbackDto implements RecordFeedbackRequest {
  @ApiProperty({ enum: Object.values(FEEDBACK_MILESTONE) })
  @IsIn(Object.values(FEEDBACK_MILESTONE))
  milestone!: FeedbackMilestone;

  @ApiProperty({
    type: Number,
    nullable: true,
    minimum: FEEDBACK_LIMIT.ScoreMin,
    maximum: FEEDBACK_LIMIT.ScoreMax,
    description: 'Required key; null records "not now"',
  })
  @IsFeedbackScore()
  score!: FeedbackScore | null;

  @ApiPropertyOptional({
    maxLength: FEEDBACK_LIMIT.CommentMax,
    description:
      'Needs a score. A repeat for the same milestone (same score) appends it after a blank line; all comments together stay within the limit',
  })
  // Absent is fine; null is not (IsOptional would let it through), so IsString reports it.
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @TrimToAbsent()
  @IsString()
  @NoControlChars(true)
  @MaxLength(FEEDBACK_LIMIT.CommentMax)
  @NoCommentWithoutScore()
  comment?: string;
}
