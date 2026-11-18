import Anthropic from '@anthropic-ai/sdk';
import { ASK_LIMIT } from '@shelfmark/contracts';
import { ASK_SYSTEM_PROMPT } from '../prompt/ask-system-prompt.const';
import { buildAskUserPrompt } from '../prompt/build-ask-prompt';
import { buildLinkUserPrompt } from '../prompt/build-link-prompt';
import { LINK_OUTPUT_SCHEMA } from '../prompt/link-output.schema';
import { LINK_SYSTEM_PROMPT } from '../prompt/link-system-prompt.const';
import { buildTagSynonymsPrompt } from '../prompt/build-tag-synonyms-prompt';
import { TAG_SYNONYMS_SCHEMA } from '../prompt/tag-synonyms.schema';
import { TAG_SYNONYMS_SYSTEM_PROMPT } from '../prompt/tag-synonyms-system-prompt.const';
import { TAG_SYNONYMS_LIMIT } from '../models/tag-synonyms-limit.const';
import type { TagSynonymsInput } from '../models/tag-synonyms-input.interface';
import type { TagSynonymsOutcome } from '../models/tag-synonyms-outcome.type';
import { ANTHROPIC_LIMIT } from '../models/anthropic-limit.const';
import { AI_EFFORT, AI_MODEL } from '../models/ai-model.const';
import { AI_PROVIDER_NAME } from '../models/ai-provider-name.const';
import { ASK_STOP_REASON } from '../models/ask-stop-reason.const';
import type { AskChunk } from '../models/ask-chunk.type';
import type { AskInput } from '../models/ask-input.interface';
import type { AskStopReason } from '../models/ask-stop-reason.type';
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
 * An Ask answer (ADR 0051 point 4): Sonnet at medium effort, plain text, no tools, no thinking (the
 * first text must arrive within `ASK_LIMIT.FirstTokenMs`), the fixed system prompt first with a cache
 * breakpoint.
 */
function askParamsFor(input: AskInput): StreamParams {
  return {
    model: AI_MODEL.Ask,
    max_tokens: ANTHROPIC_LIMIT.AskMaxTokens,
    system: [{ type: 'text', text: ASK_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: buildAskUserPrompt(input) }],
    thinking: { type: 'disabled' },
    output_config: { effort: AI_EFFORT.Ask },
  };
}

function askStopReason(reason: string | null): AskStopReason {
  if (reason === STOP_REASON_REFUSAL) return ASK_STOP_REASON.Refusal;
  if (reason === STOP_REASON_MAX_TOKENS) return ASK_STOP_REASON.MaxTokens;
  return ASK_STOP_REASON.Done;
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
function outcomeOfError(error: unknown): LinkJobOutcome {
  const status =
    typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;
  if (typeof status !== 'number') return { type: 'error', retryable: true };
  const retryable =
    status >= 500 || (ANTHROPIC_LIMIT.RetryableStatuses as readonly number[]).includes(status);
  return { type: 'error', retryable };
}

/**
 * The real provider: Claude Haiku 5.5 at low effort, structured output through
 * `output_config.format`, a `refusal` stop reason answered as a refusal, Message Batches for the
 * backfill. The only file that imports the SDK (ADR 0048 point 10); the SDK calls its own fixed host.
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

  /**
   * Streams an Ask answer through `client.messages.stream` (SDK timeout `ASK_LIMIT.StreamMaxMs`,
   * retries off, the caller's abort signal). Yields text deltas only (never thinking or other
   * blocks), then the stop reason with the token counts; any failure, an abort included, ends with
   * one `error`. The stream is aborted when the consumer stops early.
   */
  async *askStream(input: AskInput, signal: AbortSignal): AsyncGenerator<AskChunk> {
    let stream: ReturnType<AnthropicClient['messages']['stream']> | null = null;
    let finished = false;
    try {
      stream = this.client.messages.stream(askParamsFor(input), {
        timeout: ASK_LIMIT.StreamMaxMs,
        maxRetries: ANTHROPIC_LIMIT.MaxRetries,
        signal,
      });
      let inputTokens = 0;
      let outputTokens = 0;
      let stopReason: string | null = null;
      for await (const event of stream) {
        if (event.type === 'message_start') {
          const usage = event.message.usage;
          inputTokens =
            usage.input_tokens +
            (usage.cache_creation_input_tokens ?? 0) +
            (usage.cache_read_input_tokens ?? 0);
        } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          if (event.delta.text !== '') yield { type: 'text', text: event.delta.text };
        } else if (event.type === 'message_delta') {
          stopReason = event.delta.stop_reason;
          outputTokens = event.usage.output_tokens;
        }
      }
      finished = true;
      yield { type: 'end', stopReason: askStopReason(stopReason), inputTokens, outputTokens };
    } catch (error) {
      finished = true;
      const outcome = outcomeOfError(error);
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
