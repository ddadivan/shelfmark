import { ApiProperty } from '@nestjs/swagger';
import type { CreateMcpTokenResponse } from '@shelfmark/contracts';
import { McpTokenSummaryDto } from './mcp-token-summary.dto';

export class CreateMcpTokenResponseDto implements CreateMcpTokenResponse {
  @ApiProperty({ type: McpTokenSummaryDto }) token!: McpTokenSummaryDto;

  @ApiProperty({ description: 'The token itself: shown once, never answered again' })
  secret!: string;
}
