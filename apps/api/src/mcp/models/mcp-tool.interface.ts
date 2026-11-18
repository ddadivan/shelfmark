import type { McpParseResult } from './mcp-parse-result.type';
import type { McpPrincipal } from './mcp-principal.interface';
import type { McpToolDefinition } from './mcp-tool-definition.interface';
import type { McpToolOutcome } from './mcp-tool-outcome.type';

/**
 * One read-only tool: its definition, a narrowing parser for the arguments (unknown keys refused)
 * and `run`, which queries only `principal.userId` and returns allow-listed data.
 */
export interface McpTool<TArgs> {
  readonly definition: McpToolDefinition;
  parse(args: Record<string, unknown>): McpParseResult<TArgs>;
  run(principal: McpPrincipal, args: TArgs): Promise<McpToolOutcome>;
}
