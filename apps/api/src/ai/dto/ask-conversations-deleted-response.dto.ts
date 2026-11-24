import { ApiProperty } from '@nestjs/swagger';
import type { AskConversationsDeletedResponse } from '@shelfmark/contracts';

export class AskConversationsDeletedResponseDto implements AskConversationsDeletedResponse {
  @ApiProperty({ minimum: 0 }) deleted!: number;
}
