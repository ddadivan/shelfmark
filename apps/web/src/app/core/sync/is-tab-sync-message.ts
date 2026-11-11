import { TAB_SYNC_KIND } from './models/tab-sync-kind.const';
import type { TabSyncMessage } from './models/tab-sync-message.type';

const KINDS = new Set<string>(Object.values(TAB_SYNC_KIND));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Whether `data` from the channel is a message this version understands. The channel is
 * same-origin only, but an older or newer tab may post shapes this one does not know.
 */
export function isTabSyncMessage(data: unknown): data is TabSyncMessage {
  if (!isRecord(data) || typeof data['userId'] !== 'string' || typeof data['kind'] !== 'string') {
    return false;
  }
  if (!KINDS.has(data['kind'])) {
    return false;
  }
  switch (data['kind']) {
    case TAB_SYNC_KIND.LinkSaved:
    case TAB_SYNC_KIND.LinkChanged: {
      const link = data['link'];
      return isRecord(link) && typeof link['id'] === 'string' && typeof link['url'] === 'string';
    }
    case TAB_SYNC_KIND.LinkRemoved:
      return typeof data['id'] === 'string';
    default:
      return true;
  }
}
