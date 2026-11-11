import { ApiProperty } from '@nestjs/swagger';
import {
  FEEDBACK_MESSAGE_KIND,
  FEEDBACK_STATUS,
  type FeedbackMessage,
  type FeedbackMessageKind,
  type FeedbackStatus,
  type ListFeedbackMessagesResponse,
} from '@shelfmark/contracts';

export class FeedbackMessageResponseDto implements FeedbackMessage {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ enum: Object.values(FEEDBACK_MESSAGE_KIND) }) kind!: FeedbackMessageKind;
  @ApiProperty() text!: string;
  @ApiProperty({ enum: Object.values(FEEDBACK_STATUS) }) status!: FeedbackStatus;
  @ApiProperty({ nullable: true, type: String }) reply!: string | null;
  @ApiProperty({ nullable: true, type: String }) screenshotUrl!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class ListFeedbackMessagesResponseDto implements ListFeedbackMessagesResponse {
  @ApiProperty({ type: [FeedbackMessageResponseDto] }) items!: FeedbackMessageResponseDto[];
}
