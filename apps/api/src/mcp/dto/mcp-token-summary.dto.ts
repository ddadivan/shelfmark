import { ApiProperty } from '@nestjs/swagger';
import { MCP_TOKEN_ACCESS, type McpTokenAccess, type McpTokenSummary } from '@shelfmark/contracts';

export class McpTokenSummaryDto implements McpTokenSummary {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ description: 'Last four characters of the secret' }) last4!: string;
  @ApiProperty() includeNotes!: boolean;
  @ApiProperty({ enum: Object.values(MCP_TOKEN_ACCESS) }) access!: McpTokenAccess;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({
    format: 'date-time',
    nullable: true,
    type: String,
    description: 'Refused from then on',
  })
  expiresAt!: string | null;
  @ApiProperty({ format: 'date-time', nullable: true, type: String }) lastUsedAt!: string | null;
  @ApiProperty({ description: 'Calls in the last 7 UTC days' }) callsThisWeek!: number;
}
