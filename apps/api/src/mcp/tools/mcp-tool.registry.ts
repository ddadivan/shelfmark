import { Injectable } from '@nestjs/common';
import { MCP_TOOL_CALL_KIND } from '../models/mcp-tool-call-kind.const';
import type { McpPrincipal } from '../models/mcp-principal.interface';
import type { McpTool } from '../models/mcp-tool.interface';
import type { McpToolCall } from '../models/mcp-tool-call.type';
import type { McpToolDefinition } from '../models/mcp-tool-definition.interface';
import type { McpToolEntry } from '../models/mcp-tool-entry.interface';

function toEntry<T>(tool: McpTool<T>): McpToolEntry {
  return {
    definition: tool.definition,
    async call(principal, args) {
      const parsed = tool.parse(args);
      if (parsed.kind === MCP_TOOL_CALL_KIND.Invalid) return parsed;
      return tool.run(principal, parsed.value);
    },
  };
}

/** The tools of the MCP server, in `tools/list` order. Read-only, every one of them. */
@Injectable()
export class McpToolRegistry {
  private readonly entries: readonly McpToolEntry[];

  constructor() {
    this.entries = ([] as McpTool<never>[]).map(toEntry);
  }

  definitions(): McpToolDefinition[] {
    return this.entries.map((entry) => entry.definition);
  }

  /** Parses the arguments and runs the tool; an unknown name is `Unknown`. */
  call(name: string, principal: McpPrincipal, args: Record<string, unknown>): Promise<McpToolCall> {
    const entry = this.entries.find((candidate) => candidate.definition.name === name);
    if (!entry) return Promise.resolve({ kind: MCP_TOOL_CALL_KIND.Unknown });
    return entry.call(principal, args);
  }
}
