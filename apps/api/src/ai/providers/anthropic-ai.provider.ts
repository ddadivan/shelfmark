import Anthropic from '@anthropic-ai/sdk';
import { buildLinkUserPrompt } from '../prompt/build-link-prompt';
import { LINK_OUTPUT_SCHEMA } from '../prompt/link-output.schema';
import { LINK_SYSTEM_PROMPT } from '../prompt/link-system-prompt.const';
import { ANTHROPIC_LIMIT } from '../models/anthropic-limit.const';
import { AI_EFFORT, AI_MODEL } from '../models/ai-model.const';
import { AI_PROVIDER_NAME } from '../models/ai-provider-name.const';
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
type Message = Anthropic.Messages.Message;

const STOP_REASON_REFUSAL = 'refusal';
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
