import { AI_SEARCH_STATE, type AiSearchStatus } from '@shelfmark/contracts';
import type { MeaningStatusLine } from '../models/meaning-status-line.interface';

/**
 * What the "Search by meaning" row says about readiness: "{ready} of {total} links ready" while
 * links are embedded, "Ready", or "Paused until {date}" at the monthly limit. Nothing while the
 * switch is off, before the server answered, or while the provider fails (the page's
 * provider-status line covers that).
 */
export function meaningStatusLine(
  on: boolean,
  status: AiSearchStatus | null,
  resetsOn: string | null,
): MeaningStatusLine | null {
  if (!on || status === null) {
    return null;
  }
  switch (status.state) {
    case AI_SEARCH_STATE.Processing:
      return { key: 'ai.settings.meaning.progress', ready: status.ready, total: status.total };
    case AI_SEARCH_STATE.Ready:
      return { key: 'ai.settings.meaning.ready' };
    case AI_SEARCH_STATE.Quota:
      return resetsOn === null ? null : { key: 'ai.settings.meaning.quota', date: resetsOn };
    default:
      return null;
  }
}
