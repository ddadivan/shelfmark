import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '@nestjs/common';
import { buildLinkUserPrompt } from '../prompt/build-link-prompt';
import { LINK_OUTPUT_SCHEMA } from '../prompt/link-output.schema';
import { LINK_SYSTEM_PROMPT } from '../prompt/link-system-prompt.const';
import { buildTagSynonymsPrompt } from '../prompt/build-tag-synonyms-prompt';
import { TAG_SYNONYMS_SCHEMA } from '../prompt/tag-synonyms.schema';
import { TAG_SYNONYMS_SYSTEM_PROMPT } from '../prompt/tag-synonyms-system-prompt.const';
import { TAG_SYNONYMS_LIMIT } from '../models/tag-synonyms-limit.const';
import type { TagSynonymsInput } from '../models/tag-synonyms-input.interface';
import type { TagSynonymsOutcome } from '../models/tag-synonyms-outcome.type';
import { buildViewDraftPrompt } from '../prompt/build-view-draft-prompt';
import { VIEW_DRAFT_OUTPUT_SCHEMA } from '../prompt/view-draft.schema';
import { VIEW_DRAFT_SYSTEM_PROMPT } from '../prompt/view-draft-system-prompt.const';
import { VIEW_DRAFT_PROMPT_LIMIT } from '../models/view-draft-prompt-limit.const';
import type { ViewDraftInput } from '../models/view-draft-input.interface';
import type { ViewDraftModelOutcome } from '../models/view-draft-model-outcome.type';
import { ANTHROPIC_LIMIT } from '../models/anthropic-limit.const';
import { AI_EFFORT, AI_MODEL } from '../models/ai-model.const';
import { AI_PROVIDER_NAME } from '../models/ai-provider-name.const';
import { ASK_STOP_REASON } from '../models/ask-stop-reason.const';
import type { AskStopReason } from '../models/ask-stop-reason.type';
import { ASK_THINKING } from '../models/ask-thinking.const';
import { ASK_TOOL_CHOICE } from '../models/ask-tool-choice.const';
import type { AskAssistantBlock } from '../models/ask-assistant-block.type';
import type { AskMessage } from '../models/ask-message.type';
import type { AskRoundChunk } from '../models/ask-round-chunk.type';
import type { AskRoundInput } from '../models/ask-round-input.interface';
import type { AskUsageTokens } from '../models/ask-usage-tokens.interface';
import { LINK_BATCH_STATUS } from '../models/link-batch-status.const';
import type { AiConfig } from '../models/ai-config.interface';
import type { AiProvider } from '../models/ai-provider.interface';
import type { LinkBatchItem } from '../models/link-batch-item.interface';
import type { LinkBatchRequest } from '../models/link-batch-request.interface';
import type { LinkBatchStatus } from '../models/link-batch-status.type';
import type { LinkBatchSubmission } from '../models/link-batch-submission.interface';
import type { LinkJobInput } from '../models/link-job-input.interface';
import type { LinkJobOutcome } from '../models/link-job-outcome.type';

/** The parts of the SDK client this provider uses (and fakes in specs replace). */
export type AnthropicClient = Pick<Anthropic, 'messages'>;

type MessageParams = Anthropic.Messages.MessageCreateParamsNonStreaming;
type StreamParams = Anthropic.Messages.MessageStreamParams;
type Message = Anthropic.Messages.Message;

const STOP_REASON_REFUSAL = 'refusal';
const STOP_REASON_MAX_TOKENS = 'max_tokens';
const BATCH_ENDED = 'ended';
const RESULT_SUCCEEDED = 'succeeded';
const RESULT_ERRORED = 'errored';
const RESULT_EXPIRED = 'expired';
const ERROR_INVALID_REQUEST = 'invalid_request_error';

function paramsFor(input: LinkJobInput): MessageParams {
  return {
    model: AI_MODEL.LinkJob,
    max_tokens: ANTHROPIC_LIMIT.MaxTokens,
    system: LINK_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildLinkUserPrompt(input) }],
    output_config: {
      effort: AI_EFFORT.LinkJob,
      format: { type: 'json_schema', schema: LINK_OUTPUT_SCHEMA },
    },
  };
}

/** Tag synonyms (AI-5): the link-job model at low effort, structured output, tag names only. */
function tagSynonymsParamsFor(input: TagSynonymsInput): MessageParams {
  return {
    model: AI_MODEL.LinkJob,
    max_tokens: TAG_SYNONYMS_LIMIT.MaxTokens,
    system: TAG_SYNONYMS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildTagSynonymsPrompt(input) }],
    output_config: {
      effort: AI_EFFORT.LinkJob,
      format: { type: 'json_schema', schema: TAG_SYNONYMS_SCHEMA },
    },
  };
}

/**
 * A view from a phrase (#535, ADR 0056): Haiku 5.5 at low effort, no thinking (Haiku takes
 * `disabled`), structured output, the phrase plus folder paths and tag names only.
 */
export function viewDraftParamsFor(input: ViewDraftInput): MessageParams {
  return {
    model: AI_MODEL.ViewDraft,
    max_tokens: VIEW_DRAFT_PROMPT_LIMIT.MaxTokens,
    system: VIEW_DRAFT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildViewDraftPrompt(input) }],
    thinking: { type: 'disabled' },
    output_config: {
      effort: AI_EFFORT.ViewDraft,
      format: { type: 'json_schema', schema: VIEW_DRAFT_OUTPUT_SCHEMA },
    },
  };
}

const STOP_REASON_TOOL_USE = 'tool_use';
const CACHE: Anthropic.Messages.CacheControlEphemeral = { type: 'ephemeral' };

function askStopReason(reason: string | null): AskStopReason {
  if (reason === STOP_REASON_REFUSAL) return ASK_STOP_REASON.Refusal;
  if (reason === STOP_REASON_TOOL_USE) return ASK_STOP_REASON.ToolUse;
  if (reason === STOP_REASON_MAX_TOKENS) return ASK_STOP_REASON.MaxTokens;
  return ASK_STOP_REASON.Done;
}

/** A block the API gave us earlier (thinking with its signature), sent back unchanged. */
function isBlockParam(block: unknown): block is Anthropic.Messages.ContentBlockParam {
  return (
    typeof block === 'object' && block !== null && 'type' in block && typeof block.type === 'string'
  );
}

type CacheableParam =
  | Anthropic.Messages.TextBlockParam
  | Anthropic.Messages.ToolUseBlockParam
  | Anthropic.Messages.ToolResultBlockParam;

function toParamContent(
  message: AskMessage,
): CacheableParam[] | Anthropic.Messages.ContentBlockParam[] {
  if (message.role === 'user') {
    return message.content.map((block): CacheableParam =>
      block.type === 'text'
        ? { type: 'text', text: block.text }
        : {
            type: 'tool_result',
            tool_use_id: block.toolCallId,
            content: block.content,
            is_error: block.isError,
          },
    );
  }
  return message.content.flatMap((block): Anthropic.Messages.ContentBlockParam[] => {
    if (block.type === 'text') return block.text === '' ? [] : [{ type: 'text', text: block.text }];
    if (block.type === 'tool_call') {
      return [{ type: 'tool_use', id: block.id, name: block.name, input: block.input }];
    }
    return isBlockParam(block.block) ? [block.block] : [];
  });
}

/** A copy of the last block with a cache breakpoint, when it can carry one (never on thinking). */
function withCache(
  content: Anthropic.Messages.ContentBlockParam[],
): Anthropic.Messages.ContentBlockParam[] {
  const last = content.at(-1);
  if (
    last === undefined ||
    (last.type !== 'text' && last.type !== 'tool_result' && last.type !== 'tool_use')
  ) {
    return content;
  }
  return [...content.slice(0, -1), { ...last, cache_control: CACHE }];
}

/**
 * One Ask chat round (ADR 0055 points 1, 5 and 9): the profile's model, effort, thinking and token
 * cap; tools in their fixed order (also with `tool_choice: none`, so the prefix stays the same);
 * cache breakpoints after the system prompt (tools and instructions), on the last history message
 * and on the last message (the moving one).
 */
export function askRoundParamsFor(input: AskRoundInput): StreamParams {
  const last = input.messages.length - 1;
  const messages = input.messages.map((message, index): Anthropic.Messages.MessageParam => {
    const content = toParamContent(message);
    const cached = index === last || index === input.historyEnd ? withCache(content) : content;
    return { role: message.role, content: cached };
  });
  const forced = input.toolChoice === ASK_TOOL_CHOICE.None;
  return {
    model: input.profile.model,
    max_tokens: forced ? input.profile.finalMaxTokens : input.profile.roundMaxTokens,
    system: [{ type: 'text', text: input.system, cache_control: CACHE }],
    tools: input.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: { type: 'object', ...tool.inputSchema },
    })),
    tool_choice: forced ? { type: 'none' } : { type: 'auto' },
    messages,
    // Haiku 5.5 takes `disabled` (it rejects `between_tools`); Sonnet 5.5 rejects `disabled` and takes
    // `between_tools`. Both mean no thinking before the first output (pinned by a provider spec).
    thinking:
      input.profile.thinking === ASK_THINKING.BetweenTools
        ? { type: 'between_tools' }
        : { type: 'disabled' },
    output_config: { effort: input.profile.effort },
  };
}

function toAssistantBlocks(
  content: readonly Anthropic.Messages.ContentBlock[],
): AskAssistantBlock[] {
  return content.map((block): AskAssistantBlock => {
    if (block.type === 'text') return { type: 'text', text: block.text };
    if (block.type === 'tool_use') {
      return { type: 'tool_call', id: block.id, name: block.name, input: block.input };
    }
    return { type: 'opaque', block };
  });
}

function usageOf(usage: Anthropic.Messages.Usage): AskUsageTokens {
  return {
    input: usage.input_tokens,
    cacheRead: usage.cache_read_input_tokens ?? 0,
    cacheWrite: usage.cache_creation_input_tokens ?? 0,
    output: usage.output_tokens,
  };
}

/** The model's JSON, or `null` when the answer is not parseable (the validator then rejects it). */
function outputOf(message: Message): unknown {
  const text = message.content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('');
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function outcomeOfMessage(message: Message): LinkJobOutcome {
  if (message.stop_reason === STOP_REASON_REFUSAL) return { type: 'refusal' };
  return { type: 'output', output: outputOf(message) };
}

/**
 * 429, 5xx, timeouts and network failures (no HTTP status) are worth another attempt; a rejected
 * key or request (other 4xx) is not. Nothing of the error is kept: it can echo request data.
 */
const ASK_LOG = new Logger('AnthropicAsk');

/** The HTTP status of a provider error, `undefined` for a network failure or timeout. */
function statusOf(error: unknown): number | undefined {
  const status =
    typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;
  return typeof status === 'number' ? status : undefined;
}

function outcomeOfError(error: unknown): LinkJobOutcome {
  const status = statusOf(error);
  if (status === undefined) return { type: 'error', retryable: true };
  const retryable =
    status >= 500 || (ANTHROPIC_LIMIT.RetryableStatuses as readonly number[]).includes(status);
  return { type: 'error', retryable };
}

/**
 * The real provider: Claude Haiku 5.5 at low effort, structured output through
 * `output_config.format`, a `refusal` stop reason answered as a refusal, Message Batches for the
 * backfill. The only file that imports the SDK (ADR 0049 point 10); the SDK calls its own fixed host.
 * Never throws for a provider failure, never logs the prompt, the page text, the output or the key.
 */
export class AnthropicAiProvider implements AiProvider {
  readonly name = AI_PROVIDER_NAME.Anthropic;

  constructor(private readonly client: AnthropicClient) {}

  async runLinkJob(input: LinkJobInput): Promise<LinkJobOutcome> {
    try {
      const message = await this.client.messages.create(paramsFor(input), {
        timeout: ANTHROPIC_LIMIT.TimeoutMs,
        maxRetries: ANTHROPIC_LIMIT.MaxRetries,
      });
      return outcomeOfMessage(message);
    } catch (error) {
      return outcomeOfError(error);
    }
  }

  async findTagSynonyms(input: TagSynonymsInput): Promise<TagSynonymsOutcome> {
    try {
      const message = await this.client.messages.create(tagSynonymsParamsFor(input), {
        timeout: ANTHROPIC_LIMIT.TimeoutMs,
        maxRetries: ANTHROPIC_LIMIT.MaxRetries,
      });
      return outcomeOfMessage(message);
    } catch (error) {
      return outcomeOfError(error);
    }
  }

  async draftView(input: ViewDraftInput): Promise<ViewDraftModelOutcome> {
    try {
      const message = await this.client.messages.create(viewDraftParamsFor(input), {
        timeout: ANTHROPIC_LIMIT.TimeoutMs,
        maxRetries: ANTHROPIC_LIMIT.MaxRetries,
      });
      return outcomeOfMessage(message);
    } catch (error) {
      return outcomeOfError(error);
    }
  }

  /**
   * One Ask chat round through `client.messages.stream` (SDK timeout = what is left of the budget,
   * retries off, the caller's abort signal). Yields text deltas and the start of each tool call, then
   * `end` with the assistant blocks exactly as returned (thinking blocks with signatures stay opaque
   * for the next round of the same loop, never yielded as text) and the usage, cache reads and writes
   * included; any failure, an abort included, ends with one `error`. The stream is aborted when the
   * consumer stops early.
   */
  async *askRound(input: AskRoundInput, signal: AbortSignal): AsyncGenerator<AskRoundChunk> {
    let stream: ReturnType<AnthropicClient['messages']['stream']> | null = null;
    let finished = false;
    try {
      stream = this.client.messages.stream(askRoundParamsFor(input), {
        timeout: Math.max(1, input.timeoutMs),
        maxRetries: ANTHROPIC_LIMIT.MaxRetries,
        signal,
      });
      for await (const event of stream) {
        if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
          yield { type: 'tool_start', name: event.content_block.name };
        } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          if (event.delta.text !== '') yield { type: 'text', text: event.delta.text };
        }
      }
      const message = await stream.finalMessage();
      finished = true;
      yield {
        type: 'end',
        stopReason: askStopReason(message.stop_reason),
        blocks: toAssistantBlocks(message.content),
        usage: usageOf(message.usage),
      };
    } catch (error) {
      finished = true;
      const outcome = outcomeOfError(error);
      ASK_LOG.warn(`Ask round provider error: status ${statusOf(error) ?? 'none'}`);
      yield { type: 'error', retryable: outcome.type === 'error' && outcome.retryable };
    } finally {
      if (!finished) stream?.abort();
    }
  }

  async submitLinkBatch(requests: readonly LinkBatchRequest[]): Promise<LinkBatchSubmission> {
    const batch = await this.client.messages.batches.create(
      {
        requests: requests.map((request) => ({
          custom_id: request.customId,
          params: paramsFor(request.input),
        })),
      },
      { timeout: ANTHROPIC_LIMIT.TimeoutMs, maxRetries: ANTHROPIC_LIMIT.MaxRetries },
    );
    return { providerBatchId: batch.id, completed: null };
  }

  async getLinkBatchStatus(providerBatchId: string): Promise<LinkBatchStatus> {
    const batch = await this.client.messages.batches.retrieve(providerBatchId, undefined, {
      timeout: ANTHROPIC_LIMIT.TimeoutMs,
      maxRetries: ANTHROPIC_LIMIT.MaxRetries,
    });
    return batch.processing_status === BATCH_ENDED
      ? LINK_BATCH_STATUS.Ended
      : LINK_BATCH_STATUS.InProgress;
  }

  async readLinkBatchResults(providerBatchId: string): Promise<LinkBatchItem[]> {
    const decoder = await this.client.messages.batches.results(providerBatchId, undefined, {
      timeout: ANTHROPIC_LIMIT.TimeoutMs,
      maxRetries: ANTHROPIC_LIMIT.MaxRetries,
    });
    const items: LinkBatchItem[] = [];
    for await (const item of decoder) {
      items.push({ customId: item.custom_id, outcome: this.outcomeOfBatchResult(item.result) });
    }
    return items;
  }

  async cancelLinkBatch(providerBatchId: string): Promise<void> {
    await this.client.messages.batches.cancel(providerBatchId, undefined, {
      timeout: ANTHROPIC_LIMIT.TimeoutMs,
      maxRetries: ANTHROPIC_LIMIT.MaxRetries,
    });
  }

  private outcomeOfBatchResult(
    result: Anthropic.Messages.Batches.MessageBatchResult,
  ): LinkJobOutcome {
    if (result.type === RESULT_SUCCEEDED) return outcomeOfMessage(result.message);
    if (result.type === RESULT_ERRORED) {
      return { type: 'error', retryable: result.error.error.type !== ERROR_INVALID_REQUEST };
    }
    // Expired requests were never processed and can run again; canceled ones were stopped on purpose.
    return { type: 'error', retryable: result.type === RESULT_EXPIRED };
  }
}

/**
 * Builds the real provider from the boot configuration (`REAL_AI_PROVIDER_FACTORY`). Called lazily,
 * once, and only when `AiConfig.useRealProvider` is true, which no test configuration produces; the
 * test setup makes the SDK client's constructor throw as a second guard.
 */
export function createAnthropicProvider(config: AiConfig): AiProvider {
  if (config.apiKey === null) {
    throw new Error('Invalid configuration: ANTHROPIC_API_KEY is required for the real provider');
  }
  return new AnthropicAiProvider(
    new Anthropic({
      apiKey: config.apiKey,
      baseURL: ANTHROPIC_LIMIT.BaseUrl,
      maxRetries: ANTHROPIC_LIMIT.MaxRetries,
      timeout: ANTHROPIC_LIMIT.TimeoutMs,
    }),
  );
}
