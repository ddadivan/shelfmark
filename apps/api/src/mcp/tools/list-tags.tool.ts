import { Injectable } from '@nestjs/common';
import { TagsService } from '../../tags/tags.service';
import type { McpParseResult } from '../models/mcp-parse-result.type';
import type { McpPrincipal } from '../models/mcp-principal.interface';
import { MCP_READ_ONLY_ANNOTATIONS } from '../models/mcp-read-only-annotations.const';
import type { McpTag } from '../models/mcp-tag.interface';
import type { McpTool } from '../models/mcp-tool.interface';
import { MCP_TOOL_CALL_KIND } from '../models/mcp-tool-call-kind.const';
import type { McpToolDefinition } from '../models/mcp-tool-definition.interface';
import { MCP_TOOL_NAME } from '../models/mcp-tool-name.const';
import type { McpToolOutcome } from '../models/mcp-tool-outcome.type';
import { MCP_UNTRUSTED_CONTENT_NOTE } from '../models/mcp-untrusted-content-note.const';
import { hasOnlyKeys, invalidArgs, validArgs } from './tool-args';

/** `list_tags`: the tags on the user's live links, most used first. */
@Injectable()
export class ListTagsTool implements McpTool<Record<string, never>> {
  readonly definition: McpToolDefinition = {
    name: MCP_TOOL_NAME.ListTags,
    title: 'List tags',
    description: `List the tags on the user's links, most used first, each with its number of links. ${MCP_UNTRUSTED_CONTENT_NOTE}`,
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    outputSchema: {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: {
            type: 'object',
            properties: { name: { type: 'string' }, links: { type: 'integer' } },
            required: ['name', 'links'],
            additionalProperties: false,
          },
        },
      },
      required: ['tags'],
      additionalProperties: false,
    },
    annotations: MCP_READ_ONLY_ANNOTATIONS,
  };

  constructor(private readonly tagsService: TagsService) {}

  parse(args: Record<string, unknown>): McpParseResult<Record<string, never>> {
    return hasOnlyKeys(args, []) ? validArgs({}) : invalidArgs('This tool takes no arguments');
  }

  async run(principal: McpPrincipal): Promise<McpToolOutcome> {
    const { items } = await this.tagsService.list(principal.userId);
    const tags: McpTag[] = items
      .filter((tag) => tag.linkCount > 0)
      .map((tag) => ({ name: tag.name, links: tag.linkCount }));
    return { kind: MCP_TOOL_CALL_KIND.Ok, structured: { tags }, count: tags.length };
  }
}
