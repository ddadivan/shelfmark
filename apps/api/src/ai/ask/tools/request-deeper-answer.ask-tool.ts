import { Injectable } from '@nestjs/common';
import { ASK_ESCALATION_REASON } from '../../models/ask-escalation-reason.const';
import { ASK_TOOL_NAME } from '../../models/ask-tool-name.const';
import type { AskEscalationReason } from '../../models/ask-escalation-reason.type';
import type { AskParse } from '../../models/ask-parse.type';
import type { AskTool } from '../../models/ask-tool.interface';
import type { AskToolDefinition } from '../../models/ask-tool-definition.interface';
import type { AskToolOutcome } from '../../models/ask-tool-outcome.interface';
import { accept, argsObject, onlyKeys, refuse } from './ask-tool-args';

function isReason(value: unknown): value is AskEscalationReason {
  return Object.values<unknown>(ASK_ESCALATION_REASON).includes(value);
}

/** `request_deeper_answer` arguments: one reason of `ASK_ESCALATION_REASON`. */
export function parseDeeperAnswerArgs(input: unknown): AskParse<{ reason: AskEscalationReason }> {
  const args = argsObject(input);
  if (args === null || !onlyKeys(args, ['reason'])) return refuse('Unknown argument');
  const reason = args['reason'];
  return isReason(reason)
    ? accept({ reason })
    : refuse(`reason must be one of ${Object.values(ASK_ESCALATION_REASON).join(', ')}`);
}

/**
 * `request_deeper_answer` (ADR 0055 point 1): the quick model's control tool, never offered to the
 * deep model. It only reports the request; the loop decides (before any text, within
 * `ASK_LIMIT.EscalateBeforeMs`, once per question, while the deep allowance lasts) and otherwise
 * answers it with an error result telling the model to answer itself.
 */
@Injectable()
export class RequestDeeperAnswerAskTool implements AskTool {
  readonly activity = null;
  readonly definition: AskToolDefinition = {
    name: ASK_TOOL_NAME.RequestDeeperAnswer,
    description:
      'Hand this question to a stronger model. Call it before writing any text, only when: several dependent counts or filters must be combined (multi_step); the user wants a comparison, summary or themes across many links (synthesis); the user asks for detail or to think harder (depth_requested); or you would otherwise answer with low confidence (unsure). Plain lookups, counts, lists and follow-ups never need it.',
    inputSchema: {
      type: 'object',
      properties: { reason: { type: 'string', enum: Object.values(ASK_ESCALATION_REASON) } },
      required: ['reason'],
      additionalProperties: false,
    },
  };

  call(_context: unknown, input: unknown): Promise<AskToolOutcome> {
    const parsed = parseDeeperAnswerArgs(input);
    if (!parsed.ok) return Promise.resolve({ isError: true, data: parsed.message, found: null });
    return Promise.resolve({
      isError: false,
      data: { requested: true },
      found: null,
      escalate: parsed.value.reason,
    });
  }
}
