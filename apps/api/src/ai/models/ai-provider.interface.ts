import type { AiProviderName } from './ai-provider-name.type';
import type { AskRoundChunk } from './ask-round-chunk.type';
import type { AskRoundInput } from './ask-round-input.interface';
import type { ImportGroupNamesInput } from './import-group-names-input.interface';
import type { ImportGroupNamesOutcome } from './import-group-names-outcome.type';
import type { LinkBatchItem } from './link-batch-item.interface';
import type { LinkBatchRequest } from './link-batch-request.interface';
import type { LinkBatchStatus } from './link-batch-status.type';
import type { LinkBatchSubmission } from './link-batch-submission.interface';
import type { LinkJobInput } from './link-job-input.interface';
import type { LinkJobOutcome } from './link-job-outcome.type';
import type { TagSynonymsInput } from './tag-synonyms-input.interface';
import type { TagSynonymsOutcome } from './tag-synonyms-outcome.type';

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
   * One model call of the Ask chat loop (ADR 0055 point 5): with tools, the profile's model, thinking
   * and token caps and the cache breakpoints. `text` and `tool_start` chunks, then exactly one `end`
   * or `error`. Never throws; stops promptly when `signal` aborts.
   */
  askRound(input: AskRoundInput, signal: AbortSignal): AsyncIterable<AskRoundChunk>;
  /**
   * Synonym pairs among the user's tag names (AI-5, ADR 0053): names only, as keys `t1…`. Never
   * throws; the output is narrowed by `parseTagSynonymsOutput`.
   */
  findTagSynonyms(input: TagSynonymsInput): Promise<TagSynonymsOutcome>;
  /**
   * Folder names for the topic clusters of an import (ADR 0056 decision 10), one call for all
   * clusters: a few sample titles per cluster, keys `g1…`. Never throws; the output is narrowed by
   * `parseImportGroupNamesOutput`.
   */
  nameImportGroups(input: ImportGroupNamesInput): Promise<ImportGroupNamesOutcome>;
}
