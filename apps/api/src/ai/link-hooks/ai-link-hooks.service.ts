import { Injectable } from '@nestjs/common';
import { SUMMARY_SOURCE } from '@shelfmark/contracts';
import type { Prisma } from '../../generated/prisma/client';
import { AiJobsService } from '../jobs/ai-jobs.service';
import type { AiEnqueueResult } from '../models/ai-enqueue-result.interface';
import type { AiRequestContext } from '../models/ai-request-context.interface';
import type { LinkUpdateChange } from '../models/link-update-change.interface';
import { AiSuggestionsService } from '../suggestions/ai-suggestions.service';

type Tx = Prisma.TransactionClient;

const NO_JOBS: AiEnqueueResult = { jobIds: [], touched: false };

/** Whether two tag name lists hold the same names, ignoring case and order. */
function sameNames(a: readonly string[], b: readonly string[]): boolean {
  const left = new Set(a.map((name) => name.toLowerCase()));
  const right = new Set(b.map((name) => name.toLowerCase()));
  return left.size === right.size && [...left].every((name) => right.has(name));
}

/**
 * The AI steps of a link edit (`LinksWriteService.update`), inside its transaction: the user's own
 * folder or tag choice settles the suggestion marks (#390), and a new page asks AI again unless the
 * summary is the user's (ADR 0048). Every statement filters by the session `userId`.
 */
@Injectable()
export class AiLinkHooksService {
  constructor(
    private readonly jobs: AiJobsService,
    private readonly suggestions: AiSuggestionsService,
  ) {}

  /** After the link row was written; `touched` means the row must be read again. */
  async afterUpdate(
    tx: Tx,
    userId: string,
    change: LinkUpdateChange,
    context: AiRequestContext,
  ): Promise<AiEnqueueResult> {
    const folderChanged = change.folderSent && change.folderAfter !== change.folderBefore;
    const tagsChanged = change.tagsSent && !sameNames(change.tagsBefore, change.tagsAfter);
    if (folderChanged || tagsChanged) {
      await this.suggestions.afterUserEdit(tx, userId, change.linkId, {
        ...(folderChanged ? { folderId: change.folderAfter } : {}),
        ...(tagsChanged ? { tags: change.tagsAfter } : {}),
      });
    }
    if (!change.newPage || change.summarySource === SUMMARY_SOURCE.User) return NO_JOBS;
    return this.jobs.enqueue(
      tx,
      userId,
      [
        {
          linkId: change.linkId,
          folderSet: change.folderAfter !== null,
          tagsSet: change.tagsAfter.length > 0,
        },
      ],
      context,
    );
  }
}
