import { ApiProperty } from '@nestjs/swagger';
import type { McpTokensResponse } from '@shelfmark/contracts';
import { McpTokenSummaryDto } from './mcp-token-summary.dto';

export class McpTokensResponseDto implements McpTokensResponse {
  @ApiProperty({ description: 'Pro and not a demo account: tokens can be created and used' })
  available!: boolean;

  @ApiProperty({ type: [McpTokenSummaryDto], description: 'Newest first' })
  items!: McpTokenSummaryDto[];
}
