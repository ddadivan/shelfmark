import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MCP_LINK_SCHEMA } from '../models/mcp-link-schema.const';
import { MCP_LINK_SELECT } from '../models/mcp-link-select.const';
import type { McpParseResult } from '../models/mcp-parse-result.type';
import type { McpPrincipal } from '../models/mcp-principal.interface';
import { MCP_READ_ONLY_ANNOTATIONS } from '../models/mcp-read-only-annotations.const';
import type { McpTool } from '../models/mcp-tool.interface';
import { MCP_TOOL_CALL_KIND } from '../models/mcp-tool-call-kind.const';
import type { McpToolDefinition } from '../models/mcp-tool-definition.interface';
import { MCP_TOOL_NAME } from '../models/mcp-tool-name.const';
import type { McpToolOutcome } from '../models/mcp-tool-outcome.type';
import { MCP_UNTRUSTED_CONTENT_NOTE } from '../models/mcp-untrusted-content-note.const';
import { toMcpLink } from '../to-mcp-link';
import { loadFolderPaths } from './folder-tree';
import { hasOnlyKeys, invalidArgs, isUuid, validArgs } from './tool-args';

const KEYS = ['id'] as const;
const NOT_FOUND = 'Link not found';

/** `get_link`: one live link of the user by id; foreign, missing and trashed ids look the same. */
@Injectable()
export class GetLinkTool implements McpTool<{ id: string }> {
  readonly definition: McpToolDefinition = {
    name: MCP_TOOL_NAME.GetLink,
    title: 'Get link',
    description: `Read one saved link by its id (from search_links): URL, title, folder, tags, summary and dates. ${MCP_UNTRUSTED_CONTENT_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', format: 'uuid', description: 'The link id' } },
      required: [...KEYS],
      additionalProperties: false,
    },
    outputSchema: MCP_LINK_SCHEMA,
    annotations: MCP_READ_ONLY_ANNOTATIONS,
  };

  constructor(private readonly prisma: PrismaService) {}

  parse(args: Record<string, unknown>): McpParseResult<{ id: string }> {
    if (!hasOnlyKeys(args, KEYS)) return invalidArgs('Unknown argument');
    const id = args['id'];
    return isUuid(id) ? validArgs({ id }) : invalidArgs('id must be a UUID');
  }

  async run(principal: McpPrincipal, args: { id: string }): Promise<McpToolOutcome> {
    const row = await this.prisma.link.findFirst({
      where: { id: args.id, userId: principal.userId, deletedAt: null },
      select: MCP_LINK_SELECT,
    });
    if (!row) return { kind: MCP_TOOL_CALL_KIND.Error, message: NOT_FOUND };
    const paths = await loadFolderPaths(this.prisma, principal.userId);
    return {
      kind: MCP_TOOL_CALL_KIND.Ok,
      structured: { ...toMcpLink(row, paths, principal.includeNotes) },
      count: 1,
    };
  }
}
