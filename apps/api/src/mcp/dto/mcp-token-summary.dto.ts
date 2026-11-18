import { ApiProperty } from '@nestjs/swagger';
import type { McpTokenSummary } from '@shelfmark/contracts';

export class McpTokenSummaryDto implements McpTokenSummary {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ description: 'Last four characters of the secret' }) last4!: string;
  @ApiProperty() includeNotes!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) lastUsedAt!: string | null;
  @ApiProperty({ description: 'Calls in the last 7 UTC days' }) callsThisWeek!: number;
}
