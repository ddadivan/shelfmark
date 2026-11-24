import { ApiProperty } from '@nestjs/swagger';
import type { AskConversationSummary } from '@shelfmark/contracts';

export class AskConversationSummaryDto implements AskConversationSummary {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ description: 'The first question', maxLength: 120 }) title!: string;
  @ApiProperty({ minimum: 1 }) turns!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time', description: 'The last stored turn' }) updatedAt!: string;
}
