import type { McpPrincipal } from './mcp-principal.interface';
import type { McpToolCall } from './mcp-tool-call.type';
import type { McpToolDefinition } from './mcp-tool-definition.interface';

/** A tool of any argument type behind one call signature (`McpToolRegistry`). */
export interface McpToolEntry {
  definition: McpToolDefinition;
  call(principal: McpPrincipal, args: Record<string, unknown>): Promise<McpToolCall>;
}
