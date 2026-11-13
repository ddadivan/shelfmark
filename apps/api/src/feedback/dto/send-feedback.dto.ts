import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FEEDBACK_MESSAGE_KIND,
  FEEDBACK_MESSAGE_LIMIT,
  type FeedbackMessageKind,
  type SendFeedbackRequest,
} from '@shelfmark/contracts';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';
import { FeedbackClientInfoDto } from './feedback-client-info.dto';

export class SendFeedbackDto implements SendFeedbackRequest {
  @ApiProperty({ enum: Object.values(FEEDBACK_MESSAGE_KIND) })
  @IsIn(Object.values(FEEDBACK_MESSAGE_KIND))
  kind!: FeedbackMessageKind;

  @ApiProperty({ minLength: 1, maxLength: FEEDBACK_MESSAGE_LIMIT.TextMax })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @NoControlChars(true)
  @MaxLength(FEEDBACK_MESSAGE_LIMIT.TextMax)
  text!: string;

  @ApiPropertyOptional({ type: FeedbackClientInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => FeedbackClientInfoDto)
  client?: FeedbackClientInfoDto;
}
