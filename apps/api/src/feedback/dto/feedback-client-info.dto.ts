import { ApiProperty } from '@nestjs/swagger';
import { FEEDBACK_MESSAGE_LIMIT, type FeedbackClientInfo } from '@shelfmark/contracts';
import { IsString, MaxLength } from 'class-validator';
import { NoControlChars } from '../../common/validation/no-control-chars.decorator';

export class FeedbackClientInfoDto implements FeedbackClientInfo {
  @ApiProperty({ maxLength: FEEDBACK_MESSAGE_LIMIT.ClientInfoMax })
  @IsString()
  @NoControlChars()
  @MaxLength(FEEDBACK_MESSAGE_LIMIT.ClientInfoMax)
  appVersion!: string;

  @ApiProperty({ maxLength: FEEDBACK_MESSAGE_LIMIT.ClientInfoMax })
  @IsString()
  @NoControlChars()
  @MaxLength(FEEDBACK_MESSAGE_LIMIT.ClientInfoMax)
  userAgent!: string;
}
