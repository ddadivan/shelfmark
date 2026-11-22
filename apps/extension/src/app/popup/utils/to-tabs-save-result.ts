import type { CreateLinksBatchResponse } from '@shelfmark/contracts';
import type { SkippedTab } from '../models/skipped-tab.interface';
import type { TabEntry } from '../models/tab-entry.interface';
import type { TabsSaveResult } from '../models/tabs-save-result.interface';

/** Reads the batch answer against the tabs that were sent (`errors[].index` is the position in the request). */
export function toTabsSaveResult(
  sent: readonly TabEntry[],
  response: CreateLinksBatchResponse,
): TabsSaveResult {
  const failed = new Map(response.errors.map((error) => [error.index, error.code]));
  const skipped: SkippedTab[] = [];
  const saved: TabEntry[] = [];
  sent.forEach((entry, index) => {
    const code = failed.get(index);
    if (code === undefined) saved.push(entry);
    else skipped.push({ entry, code });
  });
  const folderIds = [...new Set(response.links.map((link) => link.folderId))];
  return { saved, skipped, folderIds };
}
