import { ApiProperty } from '@nestjs/swagger';
import type { AskConversationResponse, AskConversationTurn } from '@shelfmark/contracts';

export class AskConversationResponseDto implements AskConversationResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ maxLength: 120 }) title!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;

  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
    description:
      'AskConversationTurn[], oldest first: turn (question, answer with [n] markers, live links by marker), sources and cards re-read live (foreign, trashed or deleted links left out), steps, notFound, truncated, depth, createdAt',
  })
  turns!: AskConversationTurn[];
}
