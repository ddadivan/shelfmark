import { Injectable } from '@nestjs/common';
import { ASK_LIMIT } from '@shelfmark/contracts';
import { ASK_TOOL_LIMIT } from '../../models/ask-tool-limit.const';
import { ASK_TOOL_NAME } from '../../models/ask-tool-name.const';
import type { AskParse } from '../../models/ask-parse.type';
import type { AskTool } from '../../models/ask-tool.interface';
import type { AskToolContext } from '../../models/ask-tool-context.interface';
import type { AskToolDefinition } from '../../models/ask-tool-definition.interface';
import type { AskToolOutcome } from '../../models/ask-tool-outcome.interface';
import { accept, argsObject, onlyKeys, refuse } from './ask-tool-args';

/** `show_links` arguments: 1 to `ASK_LIMIT.CardsMax` distinct refs. */
export function parseShowLinksArgs(input: unknown): AskParse<{ refs: number[] }> {
  const args = argsObject(input);
  if (args === null || !onlyKeys(args, ['refs'])) return refuse('Unknown argument');
  const refs = args['refs'];
  const valid =
    Array.isArray(refs) &&
    refs.length >= 1 &&
    refs.length <= ASK_LIMIT.CardsMax &&
    refs.every(
      (ref) =>
        typeof ref === 'number' &&
        Number.isInteger(ref) &&
        ref >= 1 &&
        ref <= ASK_TOOL_LIMIT.RefMax,
    );
  if (!valid) return refuse(`refs must be 1 to ${ASK_LIMIT.CardsMax} link ref numbers`);
  return accept({ refs: [...new Set(refs as number[])] });
}

/**
 * `show_links` (ADR 0055 point 2): a display tool without data access. The refs of this question
 * become link cards at this point of the answer; one unknown ref makes the whole call an error.
 */
@Injectable()
export class ShowLinksAskTool implements AskTool {
  readonly activity = null;
  readonly definition: AskToolDefinition = {
    name: ASK_TOOL_NAME.ShowLinks,
    description: `Show links of this conversation to the user as cards at this point of your answer (1 to ${ASK_LIMIT.CardsMax} refs, in the order given). Use it when the user wants to find, list or see links; then write one short sentence instead of repeating the titles.`,
    inputSchema: {
      type: 'object',
      properties: {
        refs: {
          type: 'array',
          items: { type: 'integer', minimum: 1, maximum: ASK_TOOL_LIMIT.RefMax },
          minItems: 1,
          maxItems: ASK_LIMIT.CardsMax,
        },
      },
      required: ['refs'],
      additionalProperties: false,
    },
  };

  call(context: AskToolContext, input: unknown): Promise<AskToolOutcome> {
    const parsed = parseShowLinksArgs(input);
    if (!parsed.ok) return Promise.resolve({ isError: true, data: parsed.message, found: null });
    if (!parsed.value.refs.every((ref) => context.refs.has(ref))) {
      return Promise.resolve({
        isError: true,
        data: 'Unknown ref; show only refs from this conversation',
        found: null,
      });
    }
    return Promise.resolve({
      isError: false,
      data: { shown: parsed.value.refs.length },
      found: null,
      show: parsed.value.refs,
    });
  }
}
