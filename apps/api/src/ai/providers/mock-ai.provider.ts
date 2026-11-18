import { randomUUID } from 'node:crypto';
import { AI_PART } from '../models/ai-part.const';
import { AI_PROVIDER_NAME } from '../models/ai-provider-name.const';
import { LINK_BATCH_STATUS } from '../models/link-batch-status.const';
import { MOCK_AI } from '../models/mock-ai-limit.const';
import type { AiProvider } from '../models/ai-provider.interface';
import type { LinkBatchItem } from '../models/link-batch-item.interface';
import type { LinkBatchRequest } from '../models/link-batch-request.interface';
import type { LinkBatchStatus } from '../models/link-batch-status.type';
import type { LinkBatchSubmission } from '../models/link-batch-submission.interface';
import type { LinkJobInput } from '../models/link-job-input.interface';
import type { LinkJobOutcome } from '../models/link-job-outcome.type';

const VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com'];

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= MOCK_AI.MinWordLength);
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
 * `ai-refuse` answers a refusal and one with `ai-fail` a retryable outage.
 */
export class MockAiProvider implements AiProvider {
  readonly name = AI_PROVIDER_NAME.Mock;

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
    const siteName = host.split('.').slice(-2, -1)[0] ?? '';
    const newTag =
      wantsTags && siteName.length >= MOCK_AI.MinWordLength && !input.tags.includes(siteName)
        ? siteName
        : null;
    const folder = wantsFolder
      ? (input.folders.find((candidate) => matches(candidate.path))?.key ?? null)
      : null;
    const subject = (input.title ?? host) || input.url;
    return {
      tags,
      newTag,
      folder,
      summary: wantsSummary ? `A page about ${subject}.`.slice(0, MOCK_AI.SummaryMax) : null,
      kind: VIDEO_HOSTS.includes(host) ? 'video' : 'article',
    };
  }
}
