import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { McpFolder } from '../models/mcp-folder.interface';
import type { McpParseResult } from '../models/mcp-parse-result.type';
import type { McpPrincipal } from '../models/mcp-principal.interface';
import { MCP_READ_ONLY_ANNOTATIONS } from '../models/mcp-read-only-annotations.const';
import type { McpTool } from '../models/mcp-tool.interface';
import { MCP_TOOL_CALL_KIND } from '../models/mcp-tool-call-kind.const';
import type { McpToolDefinition } from '../models/mcp-tool-definition.interface';
import { MCP_TOOL_NAME } from '../models/mcp-tool-name.const';
import type { McpToolOutcome } from '../models/mcp-tool-outcome.type';
import { MCP_UNTRUSTED_CONTENT_NOTE } from '../models/mcp-untrusted-content-note.const';
import { buildFolderTree, loadFolderRows } from './folder-tree';
import { hasOnlyKeys, invalidArgs, validArgs } from './tool-args';

/** `list_folders`: the user's live folders in tree order with their live link counts. */
@Injectable()
export class ListFoldersTool implements McpTool<Record<string, never>> {
  readonly definition: McpToolDefinition = {
    name: MCP_TOOL_NAME.ListFolders,
    title: 'List folders',
    description: `List the user's folders in tree order, each with its path and the number of links directly in it. ${MCP_UNTRUSTED_CONTENT_NOTE}`,
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    outputSchema: {
      type: 'object',
      properties: {
        folders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              parentId: { type: ['string', 'null'] },
              path: { type: 'string' },
              links: { type: 'integer' },
            },
            required: ['id', 'name', 'parentId', 'path', 'links'],
            additionalProperties: false,
          },
        },
      },
      required: ['folders'],
      additionalProperties: false,
    },
    annotations: MCP_READ_ONLY_ANNOTATIONS,
  };

  constructor(private readonly prisma: PrismaService) {}

  parse(args: Record<string, unknown>): McpParseResult<Record<string, never>> {
    return hasOnlyKeys(args, []) ? validArgs({}) : invalidArgs('This tool takes no arguments');
  }

  async run(principal: McpPrincipal): Promise<McpToolOutcome> {
    const { userId } = principal;
    const [rows, counts] = await Promise.all([
      loadFolderRows(this.prisma, userId),
      this.prisma.link.groupBy({
        by: ['folderId'],
        where: { userId, deletedAt: null, folderId: { not: null } },
        _count: { _all: true },
        orderBy: { folderId: 'asc' },
      }),
    ]);
    const links = new Map(counts.map((group) => [group.folderId, group._count._all]));
    const folders: McpFolder[] = buildFolderTree(rows).map((node) => ({
      id: node.id,
      name: node.name,
      parentId: node.parentId,
      path: node.path,
      links: links.get(node.id) ?? 0,
    }));
    return { kind: MCP_TOOL_CALL_KIND.Ok, structured: { folders }, count: folders.length };
  }
}
