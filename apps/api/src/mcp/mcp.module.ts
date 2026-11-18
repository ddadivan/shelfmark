import { Module } from '@nestjs/common';
import { TagsModule } from '../tags/tags.module';
import { PersonalTokenResolver } from './auth/personal-token.resolver';
import { McpDispatcher } from './json-rpc/dispatch';
import { McpController } from './mcp.controller';
import { McpServerService } from './mcp-server.service';
import { McpTokenGuard } from './mcp-token.guard';
import { McpTokensController } from './mcp-tokens.controller';
import { MCP_AUTH_RESOLVER } from './models/mcp-auth-resolver.token';
import { MCP_MEANING_SEARCH } from './models/mcp-meaning-search.token';
import { NoMeaningSearch } from './search/no-meaning-search';
import { GetLinkTool } from './tools/get-link.tool';
import { ListFoldersTool } from './tools/list-folders.tool';
import { ListTagsTool } from './tools/list-tags.tool';
import { McpToolRegistry } from './tools/mcp-tool.registry';
import { SearchLinksTool } from './tools/search-links.tool';
import { McpTokensService } from './tokens/mcp-tokens.service';
import { McpUsageService } from './usage/mcp-usage.service';

/**
 * Shelfmark MCP server (#395, ADR 0054): personal tokens (session routes) and the read-only
 * Streamable HTTP endpoint `/api/mcp` (bearer token only, never a cookie).
 */
@Module({
  imports: [TagsModule],
  controllers: [McpTokensController, McpController],
  providers: [
    McpTokensService,
    McpUsageService,
    // The OAuth seam (ADR 0054 point 8): personal tokens are the only resolver today.
    { provide: MCP_AUTH_RESOLVER, useClass: PersonalTokenResolver },
    McpTokenGuard,
    // AI-3 seam: search by meaning is not on this branch; AI-3 provides its service here.
    { provide: MCP_MEANING_SEARCH, useClass: NoMeaningSearch },
    SearchLinksTool,
    GetLinkTool,
    ListFoldersTool,
    ListTagsTool,
    McpToolRegistry,
    McpDispatcher,
    McpServerService,
  ],
})
export class McpModule {}
