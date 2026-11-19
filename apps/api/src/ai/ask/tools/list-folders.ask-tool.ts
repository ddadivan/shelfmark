import { Injectable } from '@nestjs/common';
import { ASK_ACTIVITY } from '@shelfmark/contracts';
import { buildFolderTree, loadFolderRows } from '../../../mcp/tools/folder-tree';
import { PrismaService } from '../../../prisma/prisma.service';
import { ASK_TOOL_LIMIT } from '../../models/ask-tool-limit.const';
import { ASK_TOOL_NAME } from '../../models/ask-tool-name.const';
import { ASK_UNTRUSTED_CONTENT_NOTE } from '../../models/ask-untrusted-content-note.const';
import type { AskTool } from '../../models/ask-tool.interface';
import type { AskToolContext } from '../../models/ask-tool-context.interface';
import type { AskToolDefinition } from '../../models/ask-tool-definition.interface';
import type { AskToolOutcome } from '../../models/ask-tool-outcome.interface';
import { argsObject, onlyKeys } from './ask-tool-args';

/**
 * `list_folders` (ADR 0055 point 2): the session user's live folders in tree order as paths (no
 * ids), each with its direct live link count, at most `FoldersMax`, plus the Unsorted count.
 */
@Injectable()
export class ListFoldersAskTool implements AskTool {
  readonly activity = ASK_ACTIVITY.Browse;
  readonly definition: AskToolDefinition = {
    name: ASK_TOOL_NAME.ListFolders,
    description: `List the user's folders in tree order as paths ("Parent / Child"), each with the number of links directly in it, and how many links have no folder. ${ASK_UNTRUSTED_CONTENT_NOTE}`,
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  };

  constructor(private readonly prisma: PrismaService) {}

  async call(context: AskToolContext, input: unknown): Promise<AskToolOutcome> {
    const args = argsObject(input ?? {});
    if (args === null || !onlyKeys(args, [])) {
      return { isError: true, data: 'This tool takes no arguments', found: null };
    }
    const userId = context.user.id;
    const [rows, counts] = await Promise.all([
      loadFolderRows(this.prisma, userId),
      this.prisma.link.groupBy({
        by: ['folderId'],
        where: { userId, deletedAt: null },
        _count: { _all: true },
        orderBy: { folderId: 'asc' },
      }),
    ]);
    const links = new Map(counts.map((group) => [group.folderId, group._count._all]));
    const tree = buildFolderTree(rows);
    const folders = tree
      .slice(0, ASK_TOOL_LIMIT.FoldersMax)
      .map((node) => ({ path: node.path, links: links.get(node.id) ?? 0 }));
    return {
      isError: false,
      data: {
        folders,
        more: Math.max(0, tree.length - folders.length),
        unsorted: links.get(null) ?? 0,
      },
      found: null,
    };
  }
}
