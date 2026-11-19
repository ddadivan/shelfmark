import { Injectable } from '@nestjs/common';
import { ASK_ACTIVITY } from '@shelfmark/contracts';
import { loadFolderPaths } from '../../../mcp/tools/folder-tree';
import { PrismaService } from '../../../prisma/prisma.service';
import { ASK_LINK_SELECT } from '../../models/ask-link-select.const';
import { ASK_TOOL_LIMIT } from '../../models/ask-tool-limit.const';
import { ASK_TOOL_NAME } from '../../models/ask-tool-name.const';
import { ASK_UNTRUSTED_CONTENT_NOTE } from '../../models/ask-untrusted-content-note.const';
import type { AskParse } from '../../models/ask-parse.type';
import type { AskTool } from '../../models/ask-tool.interface';
import type { AskToolContext } from '../../models/ask-tool-context.interface';
import type { AskToolDefinition } from '../../models/ask-tool-definition.interface';
import type { AskToolOutcome } from '../../models/ask-tool-outcome.interface';
import { accept, argsObject, onlyKeys, optionalInt, refuse } from './ask-tool-args';
import { toAskToolLink } from './to-ask-tool-link';

const UNKNOWN_REF = 'Unknown ref; use a ref from this conversation';

/** `get_link` arguments: one ref of this question (never an id). */
export function parseGetLinkArgs(input: unknown): AskParse<{ ref: number }> {
  const args = argsObject(input);
  if (args === null || !onlyKeys(args, ['ref'])) return refuse('Unknown argument');
  const ref = optionalInt(args['ref'], 1, ASK_TOOL_LIMIT.RefMax, 0);
  return ref === null || ref === 0 ? refuse('ref must be a link ref number') : accept({ ref });
}

/**
 * `get_link` (ADR 0055 point 2): one link of this question by ref, with the longer summary, the note
 * (only with "Include my notes") and the last open day. An unknown ref, or a link that is no longer a
 * live link of the session user, is an error result.
 */
@Injectable()
export class GetLinkAskTool implements AskTool {
  readonly activity = ASK_ACTIVITY.Read;
  readonly definition: AskToolDefinition = {
    name: ASK_TOOL_NAME.GetLink,
    description: `Read one link of this conversation by its ref: a longer summary, the user's note (when allowed) and when it was last opened. ${ASK_UNTRUSTED_CONTENT_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: { ref: { type: 'integer', minimum: 1, maximum: ASK_TOOL_LIMIT.RefMax } },
      required: ['ref'],
      additionalProperties: false,
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  async call(context: AskToolContext, input: unknown): Promise<AskToolOutcome> {
    const parsed = parseGetLinkArgs(input);
    if (!parsed.ok) return { isError: true, data: parsed.message, found: null };
    const { ref } = parsed.value;
    const id = context.refs.idFor(ref);
    if (id === undefined) return { isError: true, data: UNKNOWN_REF, found: null };
    const userId = context.user.id;
    const row = await this.prisma.link.findFirst({
      where: { id, userId, deletedAt: null },
      select: ASK_LINK_SELECT,
    });
    if (row === null) return { isError: true, data: UNKNOWN_REF, found: null };
    const paths = await loadFolderPaths(this.prisma, userId);
    return {
      isError: false,
      data: toAskToolLink(row, ref, paths, { includeNotes: context.includeNotes, detail: true }),
      found: null,
    };
  }
}
