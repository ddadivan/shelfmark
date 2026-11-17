import { Module } from '@nestjs/common';
import { PersonalTokenResolver } from './auth/personal-token.resolver';
import { McpDispatcher } from './json-rpc/dispatch';
import { McpController } from './mcp.controller';
import { McpServerService } from './mcp-server.service';
import { McpTokenGuard } from './mcp-token.guard';
import { McpTokensController } from './mcp-tokens.controller';
import { MCP_AUTH_RESOLVER } from './models/mcp-auth-resolver.token';
import { McpToolRegistry } from './tools/mcp-tool.registry';
import { McpTokensService } from './tokens/mcp-tokens.service';
import { McpUsageService } from './usage/mcp-usage.service';

/**
 * Shelfmark MCP server (#395, ADR 0053): personal tokens (session routes) and the read-only
 * Streamable HTTP endpoint `/api/mcp` (bearer token only, never a cookie).
 */
@Module({
  controllers: [McpTokensController, McpController],
  providers: [
    McpTokensService,
    McpUsageService,
    // The OAuth seam (ADR 0053 point 8): personal tokens are the only resolver today.
    { provide: MCP_AUTH_RESOLVER, useClass: PersonalTokenResolver },
    McpTokenGuard,
    McpToolRegistry,
    McpDispatcher,
    McpServerService,
  ],
})
export class McpModule {}
