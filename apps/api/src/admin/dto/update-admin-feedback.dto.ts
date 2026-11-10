import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ADMIN_FEEDBACK_LIMIT,
  FEEDBACK_STATUS,
  type FeedbackStatus,
  type UpdateAdminFeedbackRequest,
} from '@shelfmark/contracts';
import { Transform } from 'class-transformer';
import { IsIn, IsString, MaxLength, ValidateIf } from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';

export class UpdateAdminFeedbackDto implements UpdateAdminFeedbackRequest {
  @ApiPropertyOptional({ enum: Object.values(FEEDBACK_STATUS) })
  // Absent is fine; null is not (IsOptional would let it through), so IsIn reports it.
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(Object.values(FEEDBACK_STATUS))
  status?: FeedbackStatus;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: ADMIN_FEEDBACK_LIMIT.ReplyMax,
    description: 'null or blank clears the reply',
  })
  // null is allowed (clears); absent leaves the reply as it is.
  @ValidateIf((_object, value: unknown) => value !== undefined && value !== null)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @NoControlChars(true)
  @MaxLength(ADMIN_FEEDBACK_LIMIT.ReplyMax)
  reply?: string | null;
}
