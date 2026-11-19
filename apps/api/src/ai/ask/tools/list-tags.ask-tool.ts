import { Injectable } from '@nestjs/common';
import { ASK_ACTIVITY } from '@shelfmark/contracts';
import { TagsService } from '../../../tags/tags.service';
import { ASK_TOOL_LIMIT } from '../../models/ask-tool-limit.const';
import { ASK_TOOL_NAME } from '../../models/ask-tool-name.const';
import { ASK_UNTRUSTED_CONTENT_NOTE } from '../../models/ask-untrusted-content-note.const';
import type { AskParse } from '../../models/ask-parse.type';
import type { AskTool } from '../../models/ask-tool.interface';
import type { AskToolContext } from '../../models/ask-tool-context.interface';
import type { AskToolDefinition } from '../../models/ask-tool-definition.interface';
import type { AskToolOutcome } from '../../models/ask-tool-outcome.interface';
import { accept, argsObject, onlyKeys, optionalInt, refuse } from './ask-tool-args';

/** `list_tags` arguments: an optional `limit`. */
export function parseListTagsArgs(input: unknown): AskParse<{ limit: number }> {
  const args = argsObject(input ?? {});
  if (args === null || !onlyKeys(args, ['limit'])) return refuse('Unknown argument');
  const limit = optionalInt(args['limit'], 1, ASK_TOOL_LIMIT.TagsMax, ASK_TOOL_LIMIT.TagsDefault);
  return limit === null
    ? refuse(`limit must be an integer from 1 to ${ASK_TOOL_LIMIT.TagsMax}`)
    : accept({ limit });
}

/** `list_tags` (ADR 0055 point 2): the tags on the session user's live links, most used first. */
@Injectable()
export class ListTagsAskTool implements AskTool {
  readonly activity = ASK_ACTIVITY.Browse;
  readonly definition: AskToolDefinition = {
    name: ASK_TOOL_NAME.ListTags,
    description: `List the tags on the user's links, most used first, each with its number of links. ${ASK_UNTRUSTED_CONTENT_NOTE}`,
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: ASK_TOOL_LIMIT.TagsMax,
          default: ASK_TOOL_LIMIT.TagsDefault,
        },
      },
      additionalProperties: false,
    },
  };

  constructor(private readonly tags: TagsService) {}

  async call(context: AskToolContext, input: unknown): Promise<AskToolOutcome> {
    const parsed = parseListTagsArgs(input);
    if (!parsed.ok) return { isError: true, data: parsed.message, found: null };
    const { items } = await this.tags.list(context.user.id);
    const used = items
      .filter((tag) => tag.linkCount > 0)
      .sort((a, b) => b.linkCount - a.linkCount || a.name.localeCompare(b.name, 'en'));
    const tags = used
      .slice(0, parsed.value.limit)
      .map((tag) => ({ name: tag.name, links: tag.linkCount }));
    return {
      isError: false,
      data: { tags, more: Math.max(0, used.length - tags.length) },
      found: null,
    };
  }
}
