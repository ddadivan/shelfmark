import type { AiProviderName } from './ai-provider-name.type';
import type { AskChunk } from './ask-chunk.type';
import type { AskInput } from './ask-input.interface';
import type { LinkBatchItem } from './link-batch-item.interface';
import type { LinkBatchRequest } from './link-batch-request.interface';
import type { LinkBatchStatus } from './link-batch-status.type';
import type { LinkBatchSubmission } from './link-batch-submission.interface';
import type { LinkJobInput } from './link-job-input.interface';
import type { LinkJobOutcome } from './link-job-outcome.type';

/**
 * The server-side seam to a language model (ADR 0047 point 1, ADR 0049 point 9): the web app never
 * sees these shapes. Implementations never throw for a provider failure; they answer an outcome.
 * They never log the prompt, the page text, the output or the key.
 */
export interface AiProvider {
  readonly name: AiProviderName;
  /** One link job, now. Resolves within the provider's own timeout. */
  runLinkJob(input: LinkJobInput): Promise<LinkJobOutcome>;
  /** Submits requests for processing later (existing links, 50% cheaper). */
  submitLinkBatch(requests: readonly LinkBatchRequest[]): Promise<LinkBatchSubmission>;
  getLinkBatchStatus(providerBatchId: string): Promise<LinkBatchStatus>;
  readLinkBatchResults(providerBatchId: string): Promise<LinkBatchItem[]>;
  cancelLinkBatch(providerBatchId: string): Promise<void>;
  /**
   * One Ask answer as a stream (ADR 0052): `text` chunks, then exactly one `end` or `error`. Never
   * throws; stops promptly when `signal` aborts (the client went away or a deadline passed).
   */
  askStream(input: AskInput, signal: AbortSignal): AsyncIterable<AskChunk>;
}
