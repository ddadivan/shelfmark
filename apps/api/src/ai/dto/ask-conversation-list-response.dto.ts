import { ApiProperty } from '@nestjs/swagger';
import type { AskConversationListResponse } from '@shelfmark/contracts';
import { AskConversationSummaryDto } from './ask-conversation-summary.dto';

export class AskConversationListResponseDto implements AskConversationListResponse {
  @ApiProperty({ type: [AskConversationSummaryDto] }) items!: AskConversationSummaryDto[];
  @ApiProperty({ type: String, nullable: true }) nextCursor!: string | null;
}
