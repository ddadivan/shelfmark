import { Module } from '@nestjs/common';
import { McpTokensController } from './mcp-tokens.controller';
import { McpTokensService } from './tokens/mcp-tokens.service';

/**
 * Shelfmark MCP server (#395, ADR 0053): personal tokens (session routes) and the read-only
 * Streamable HTTP endpoint `/api/mcp` (bearer token only).
 */
@Module({
  controllers: [McpTokensController],
  providers: [McpTokensService],
})
export class McpModule {}
