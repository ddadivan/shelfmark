import { ApiProperty } from '@nestjs/swagger';
import type {
  AdminFeedbackItem,
  AdminFeedbackUser,
  AdminStatusResponse,
  ListAdminFeedbackResponse,
} from '@shelfmark/contracts';
import { FeedbackMessageResponseDto } from '../../feedback/dto/feedback-message-response.dto';

export class AdminStatusResponseDto implements AdminStatusResponse {
  @ApiProperty({ enum: [true], type: Boolean }) admin!: true;
}

export class AdminFeedbackUserDto implements AdminFeedbackUser {
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
}

export class AdminFeedbackItemDto extends FeedbackMessageResponseDto implements AdminFeedbackItem {
  @ApiProperty({ type: AdminFeedbackUserDto }) user!: AdminFeedbackUserDto;
}

export class ListAdminFeedbackResponseDto implements ListAdminFeedbackResponse {
  @ApiProperty({ type: [AdminFeedbackItemDto] }) items!: AdminFeedbackItemDto[];
  @ApiProperty({ nullable: true, type: String }) nextCursor!: string | null;
}
