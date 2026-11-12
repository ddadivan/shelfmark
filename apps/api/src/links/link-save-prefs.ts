import { LIBRARY_SETTINGS_DEFAULT, stripTrackingParams } from '@shelfmark/contracts';
import type { LinkDbClient } from './models/link-db-client.type';
import type { LinkSavePrefs } from './models/link-save-prefs.interface';

/** The save choices of the session user; the defaults when the row is gone (the save then 404s or fails anyway). */
export async function readLinkSavePrefs(db: LinkDbClient, userId: string): Promise<LinkSavePrefs> {
  const row = await db.user.findUnique({
    where: { id: userId },
    select: { fetchPreviews: true },
  });
  return row ?? { fetchPreviews: LIBRARY_SETTINGS_DEFAULT.fetchPreviews };
}

/**
 * The address to store: always without its tracking parameters (`TRACKING_QUERY_PARAMS`,
 * `utm_*`); every other parameter stays as written (#315: no longer a setting).
 */
export function savedUrl(url: string): string {
  return stripTrackingParams(url);
}
