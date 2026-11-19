import { randomUUID } from 'node:crypto';
import { AI_PART } from '../models/ai-part.const';
import { AI_PROVIDER_NAME } from '../models/ai-provider-name.const';
import { LINK_BATCH_STATUS } from '../models/link-batch-status.const';
import { MOCK_AI } from '../models/mock-ai-limit.const';
import { MOCK_ASK } from '../models/mock-ask.const';
import { ASK_STOP_REASON } from '../models/ask-stop-reason.const';
import type { AiProvider } from '../models/ai-provider.interface';
import type { LinkBatchItem } from '../models/link-batch-item.interface';
import type { LinkBatchRequest } from '../models/link-batch-request.interface';
import type { LinkBatchStatus } from '../models/link-batch-status.type';
import type { LinkBatchSubmission } from '../models/link-batch-submission.interface';
import type { LinkJobInput } from '../models/link-job-input.interface';
import type { LinkJobOutcome } from '../models/link-job-outcome.type';
import type { MockAskDelay } from '../models/mock-ask-delay.type';
import { mockAskChunks, planMockAskRound } from './mock-ask-planner';
import type { AskAssistantBlock } from '../models/ask-assistant-block.type';
import type { AskRoundChunk } from '../models/ask-round-chunk.type';
import type { AskRoundInput } from '../models/ask-round-input.interface';
import { mockImportGroupNames } from './mock-import-group-names';
import type { ImportGroupNamesInput } from '../models/import-group-names-input.interface';
import type { ImportGroupNamesOutcome } from '../models/import-group-names-outcome.type';
import { mockTagSynonyms } from './mock-tag-synonyms';
import type { TagSynonymsInput } from '../models/tag-synonyms-input.interface';
import type { TagSynonymsOutcome } from '../models/tag-synonyms-outcome.type';
import type { ViewDraftInput } from '../models/view-draft-input.interface';
import type { ViewDraftModelOutcome } from '../models/view-draft-model-outcome.type';
import { planMockViewDraft } from '@shelfmark/contracts';

const VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com'];

/**
 * The mock's kind (#535): a video host or a "talk" / "video" word in the title or description reads
 * as video, "shop" / "product" as shopping, "article" / "blog" as article; otherwise unsure (`null`),
 * so most mock links keep the kind the page and host gave them.
 */
function mockKind(host: string, haystack: ReadonlySet<string>): string | null {
  const any = (list: readonly string[]): boolean => list.some((word) => haystack.has(word));
  if (VIDEO_HOSTS.includes(host) || any(['video', 'talk', 'webinar'])) return 'video';
  if (any(['shop', 'product', 'buy'])) return 'shopping';
  if (any(['article', 'blog', 'essay'])) return 'article';
  return null;
}

/** The mock's "cleaned-up" title: the page title without a trailing site name (" | X", " - X"). */
function mockTitle(title: string | null): string | null {
  const cleaned = (title ?? '').replace(/\s+[|\-\u2013\u2014]\s+[^|\-\u2013\u2014]+$/u, '').trim();
  return cleaned !== '' && cleaned !== title ? cleaned : null;
}

/** Waits `ms` or until `signal` aborts, whichever comes first. */
const realDelay: MockAskDelay = (ms, signal) =>
  new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(done, ms);
    signal.addEventListener('abort', done, { once: true });
    function done(): void {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    }
  });

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= MOCK_AI.MinWordLength);
}

/**
 * The mock's new tags: the site's name first, and when no existing tag matched the link, longer
 * words of the title after it. The first `MOCK_AI.NewTagsMax` are the best tags, the next
 * `MOCK_AI.MoreTagsMax` the "more" ideas. Never an existing tag, in any case.
 */
function mockNewTags(
  input: LinkJobInput,
  siteName: string,
  unmatched: boolean,
): { newTags: string[]; moreTags: string[] } {
  const known = new Set(input.tags.map((name) => name.toLowerCase()));
  const topics = unmatched
    ? words(input.title ?? '').filter((word) => word.length >= MOCK_AI.TopicWordLength)
    : [];
  const names: string[] = [];
  for (const name of [siteName, ...topics]) {
    if (name.length < MOCK_AI.MinWordLength || known.has(name) || names.includes(name)) continue;
    names.push(name);
  }
  return {
    newTags: names.slice(0, MOCK_AI.NewTagsMax),
    moreTags: names.slice(MOCK_AI.NewTagsMax, MOCK_AI.NewTagsMax + MOCK_AI.MoreTagsMax),
  };
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * The provider for development, tests, CI, previews and the demo: no network, no key, deterministic.
 * Tags are the user's own tags that the link mentions, the folder is the first folder whose name the
 * link mentions, the new tag is the site's name, the summary restates the title. A URL with
 * `ai-refuse` answers a refusal and one with `ai-fail` a retryable outage. Ask rounds are planned by
 * `planMockAskRound` and stream word by word (triggers in `MOCK_ASK`); `delay` is injected so unit tests run without waits.
 */
export class MockAiProvider implements AiProvider {
  readonly name = AI_PROVIDER_NAME.Mock;

  constructor(
    private readonly delay: MockAskDelay = realDelay,
    private readonly chunkMs: number = MOCK_ASK.ChunkMs,
  ) {}

  /** Synonym pairs from `MOCK_TAG_SYNONYMS` (triggers `ai-fail`, `ai-refuse` in a tag name). */
  findTagSynonyms(input: TagSynonymsInput): Promise<TagSynonymsOutcome> {
    return Promise.resolve(mockTagSynonyms(input));
  }

  /** Group names from the clusters' own words (triggers `ai-fail`, `ai-refuse` in a title). */
  nameImportGroups(input: ImportGroupNamesInput): Promise<ImportGroupNamesOutcome> {
    return Promise.resolve(mockImportGroupNames(input));
  }

  /**
   * A view from a phrase by `planMockViewDraft` (shared with the web mock); a phrase with `ai-fail`
   * fails retryably, one with `ai-refuse` is refused.
   */
  draftView(input: ViewDraftInput): Promise<ViewDraftModelOutcome> {
    if (input.phrase.includes(MOCK_AI.RefuseMarker)) return Promise.resolve({ type: 'refusal' });
    if (input.phrase.includes(MOCK_AI.FailMarker)) {
      return Promise.resolve({ type: 'error', retryable: true });
    }
    const folders = input.folders.map((path) => ({
      id: path,
      path,
      name: path.split(' / ').at(-1) ?? path,
    }));
    return Promise.resolve({
      type: 'output',
      output: planMockViewDraft(input.phrase, { folders, tags: input.tags }),
    });
  }

  /**
   * One mock Ask chat round (ADR 0055 point 10): `planMockAskRound` decides from the messages, the
   * text streams word by word, then the tool calls start and the round ends with the blocks. No
   * opaque blocks (the mock does not think); an abort ends with `error`.
   */
  async *askRound(input: AskRoundInput, signal: AbortSignal): AsyncGenerator<AskRoundChunk> {
    const plan = planMockAskRound(input);
    if (plan.kind === 'fail') {
      yield { type: 'error', retryable: true };
      return;
    }
    const usage = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 };
    const round = input.messages.filter((message) => message.role === 'assistant').length;
    if (plan.kind === 'refuse') {
      yield { type: 'end', stopReason: ASK_STOP_REASON.Refusal, blocks: [], usage };
      return;
    }
    if (plan.slow) await this.delay(MOCK_ASK.SlowMs, signal);
    let sent = 0;
    for (const text of mockAskChunks(plan.text)) {
      if (signal.aborted || (plan.cut && sent === MOCK_ASK.CutAfterChunks)) {
        yield { type: 'error', retryable: true };
        return;
      }
      await this.delay(this.chunkMs, signal);
      if (signal.aborted) {
        yield { type: 'error', retryable: true };
        return;
      }
      yield { type: 'text', text };
      sent += 1;
    }
    const blocks: AskAssistantBlock[] = plan.text === '' ? [] : [{ type: 'text', text: plan.text }];
    for (const [index, call] of plan.calls.entries()) {
      if (signal.aborted) {
        yield { type: 'error', retryable: true };
        return;
      }
      yield { type: 'tool_start', name: call.name };
      blocks.push({
        type: 'tool_call',
        id: `${MOCK_ASK.ToolCallId}${round}-${index + 1}`,
        name: call.name,
        input: call.input,
      });
    }
    yield {
      type: 'end',
      stopReason: plan.calls.length > 0 ? ASK_STOP_REASON.ToolUse : ASK_STOP_REASON.Done,
      blocks,
      usage: { ...usage, output: sent },
    };
  }

  runLinkJob(input: LinkJobInput): Promise<LinkJobOutcome> {
    if (input.url.includes(MOCK_AI.RefuseMarker)) {
      return Promise.resolve({ type: 'refusal' });
    }
    if (input.url.includes(MOCK_AI.FailMarker)) {
      return Promise.resolve({ type: 'error', retryable: true });
    }
    return Promise.resolve({ type: 'output', output: this.answer(input) });
  }

  submitLinkBatch(requests: readonly LinkBatchRequest[]): Promise<LinkBatchSubmission> {
    const completed: LinkBatchItem[] = requests.map((request) => ({
      customId: request.customId,
      outcome: this.outcomeOf(request.input),
    }));
    return Promise.resolve({ providerBatchId: `${MOCK_AI.BatchPrefix}${randomUUID()}`, completed });
  }

  getLinkBatchStatus(): Promise<LinkBatchStatus> {
    return Promise.resolve(LINK_BATCH_STATUS.Ended);
  }

  readLinkBatchResults(): Promise<LinkBatchItem[]> {
    return Promise.resolve([]);
  }

  cancelLinkBatch(): Promise<void> {
    return Promise.resolve();
  }

  private outcomeOf(input: LinkJobInput): LinkJobOutcome {
    if (input.url.includes(MOCK_AI.RefuseMarker)) return { type: 'refusal' };
    if (input.url.includes(MOCK_AI.FailMarker)) return { type: 'error', retryable: true };
    return { type: 'output', output: this.answer(input) };
  }

  private answer(input: LinkJobInput): Record<string, unknown> {
    const host = hostOf(input.url);
    const haystack = new Set(words(`${input.title ?? ''} ${input.description ?? ''} ${input.url}`));
    const matches = (name: string): boolean => words(name).some((word) => haystack.has(word));

    const wantsTags = input.parts.includes(AI_PART.Tags);
    const wantsFolder = input.parts.includes(AI_PART.Folder);
    const wantsSummary = input.parts.includes(AI_PART.Summary);

    const tags = wantsTags ? input.tags.filter(matches).slice(0, 3) : [];
    // New tags in lower case like a real answer after `parseLinkOutput`; an existing tag in any case
    // is not new.
    const siteName = (host.split('.').slice(-2, -1)[0] ?? '').toLowerCase();
    const { newTags, moreTags } = wantsTags
      ? mockNewTags(input, siteName, tags.length === 0)
      : { newTags: [], moreTags: [] };
    const folder = wantsFolder
      ? (input.folders.find((candidate) => matches(candidate.path))?.key ?? null)
      : null;
    const subject = (input.title ?? host) || input.url;
    return {
      tags,
      newTags,
      moreTags,
      folder,
      title: input.wantsTitle ? mockTitle(input.title) : null,
      summary: wantsSummary ? `A page about ${subject}.`.slice(0, MOCK_AI.SummaryMax) : null,
      kind: mockKind(host, haystack),
    };
  }
}
