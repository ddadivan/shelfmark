import { ApiProperty } from '@nestjs/swagger';
import {
  FEEDBACK_MESSAGE_LIMIT,
  FEEDBACK_SCREENSHOT_TYPES,
  type FeedbackScreenshotType,
  type FeedbackScreenshotUpload,
} from '@shelfmark/contracts';
import { IsIn, IsString } from 'class-validator';
import { IsScreenshotData } from './is-screenshot-data.decorator';

export class FeedbackScreenshotUploadDto implements FeedbackScreenshotUpload {
  @ApiProperty({ enum: FEEDBACK_SCREENSHOT_TYPES })
  @IsIn(FEEDBACK_SCREENSHOT_TYPES)
  type!: FeedbackScreenshotType;

  @ApiProperty({
    description: `Base64 of the image, at most ${FEEDBACK_MESSAGE_LIMIT.ScreenshotMaxBytes} bytes decoded; the file signature must match type`,
  })
  @IsString()
  @IsScreenshotData()
  data!: string;
}
